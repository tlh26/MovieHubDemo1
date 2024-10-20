import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ScrollView, RefreshControl } from "react-native";
import { useTheme } from "../styles/ThemeContext";
import { useNavigation } from "@react-navigation/native";
import { followUser, getUserNotifications, unfollowUser } from "../Services/UsersApiService"; // Import from UsersApiService
import { markNotificationAsRead, deleteNotification, clearNotifications } from "../Services/NotifyApiService"; // Import from NotifyApiService
import { joinRoom, declineRoomInvite } from "../Services/RoomApiService"; // Import RoomApiService
import BottomHeader from "../Components/BottomHeader";
import moment from "moment"; // Use moment.js for date formatting

const Notifications = ({ route }) => {
    const { theme } = useTheme();
    const { userInfo } = route.params;
    const navigation = useNavigation();
    const [notifications, setNotifications] = useState([]);
    const [categorizedNotifications, setCategorizedNotifications] = useState({});
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const data = await getUserNotifications(userInfo.userId);
            const flattenedNotifications = [];
            if (data.success && data.notifications) {
                for (const category in data.notifications) {
                    if (data.notifications.hasOwnProperty(category)) {
                        const notificationsOfCategory = data.notifications[category];
                        for (const id in notificationsOfCategory) {
                            if (notificationsOfCategory.hasOwnProperty(id)) {
                                const notification = notificationsOfCategory[id];
                                flattenedNotifications.push({
                                    id,
                                    ...notification,
                                    type: category,
                                    timestamp: moment(notification.timestamp),
                                });
                            }
                        }
                    }
                }
            }
            flattenedNotifications.sort((a, b) => b.timestamp - a.timestamp);
            setNotifications(flattenedNotifications);
            setCategorizedNotifications(categorizeNotifications(flattenedNotifications));
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchNotifications();
        setIsRefreshing(false);
    };

    const handleMarkAsRead = async (id, type) => {
        try {
            await markNotificationAsRead(userInfo.userId, type, id);
            updateNotificationState(id, { read: true });
            console.log("Notification marked as read:", id, type);
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    };

    const handleDeleteNotification = async (id, type) => {
        try {
            await deleteNotification(userInfo.userId, type, id);
            removeNotificationFromState(id);
        } catch (error) {
            console.error("Failed to delete notification:", error);
        }
    };

    const handleClearNotifications = async () => {
        try {
            await clearNotifications(userInfo.userId);
            setNotifications([]);
            setCategorizedNotifications({});
        } catch (error) {
            console.error("Failed to clear notifications:", error);
        }
    };

    const handleAcceptInvite = async (shortCode, roomId) => {
        try {
            const response = await joinRoom(shortCode, userInfo.userId);
            console.log(response);
            if (response.roomId) {
                handleDeleteNotification(roomId, "room_invitations");
                navigation.navigate("ViewRoom", { userInfo, roomId: response.roomId, roomShortCode: shortCode, isUserRoom: false });
            } else {
                console.error("Failed to join room:", response.message);
            }
        } catch (error) {
            console.error("Error joining room:", error);
        }
    };

    const handleDeclineInvite = async (roomId) => {
        try {
            await declineRoomInvite(userInfo.userId, roomId);
            handleDeleteNotification(roomId, "room_invitations");
        } catch (error) {
            console.error("Error declining room invite:", error);
        }
    };

    const handleFollow = async (isFollowing, followerId) => {
        // TODO:Implement follow functionality here
        try {
            if (isFollowing) {
                await unfollowUser(userInfo.userId, otherUserInfo.uid);
            } else {
                await followUser(userInfo.userId, otherUserInfo.uid);
            }
        } catch (error) {
            console.error("Error toggling follow state:", error);
        }
    };

    const updateNotificationState = (id, updates) => {
        setNotifications((prevNotifications) => prevNotifications.map((notification) => (notification.id === id ? { ...notification, ...updates } : notification)));
        setCategorizedNotifications((prevCategorized) => {
            const updated = { ...prevCategorized };
            Object.keys(updated).forEach((category) => {
                updated[category] = updated[category].map((notification) => (notification.id === id ? { ...notification, ...updates } : notification));
            });
            return updated;
        });
    };

    const removeNotificationFromState = (id) => {
        setNotifications((prevNotifications) => prevNotifications.filter((notification) => notification.id !== id));
        setCategorizedNotifications((prevCategorized) => {
            const updated = { ...prevCategorized };
            Object.keys(updated).forEach((category) => {
                updated[category] = updated[category].filter((notification) => notification.id !== id);
            });
            return updated;
        });
    };

    // Function to categorize notifications by date
    const categorizeNotifications = (notifications) => {
        const now = moment();
        const categorized = {
            today: [],
            yesterday: [],
            lastWeek: [],
            older: [],
        };

        notifications.forEach((notification) => {
            const notificationDate = moment(notification.timestamp);
            if (notificationDate.isSame(now, "day")) {
                categorized.today.push(notification);
            } else if (notificationDate.isSame(now.clone().subtract(1, "day"), "day")) {
                categorized.yesterday.push(notification);
            } else if (notificationDate.isSameOrAfter(now.clone().subtract(7, "days"), "day")) {
                categorized.lastWeek.push(notification);
            } else {
                categorized.older.push(notification);
            }
        });

        return categorized;
    };

    const renderNotificationItem = ({ item }) => (
        <View style={[styles.notificationItem, !item.read && styles.unreadBackground, !item.read && { borderLeftWidth: 5, borderLeftColor: "#4a42c0" }]}>
            {item.avatar && <Image source={{ uri: item.avatar }} style={styles.avatar} />}
            <View style={styles.notificationContent}>
                {item.user && item.message.includes(item.user && item.notificationType !== "room_invite") ? (
                    <Text style={styles.notificationText} >
                        <Text style={styles.boldText}>{item.user}</Text>
                        {item.message.replace(item.user, "")}
                    </Text>
                ) : (
                    <Text style={[styles.notificationText, item.read ? styles.readText : styles.unreadText]}>{item.message}</Text>
                )}
            </View>
            <View style={styles.buttonContainer}>
                {item.notificationType === "follow" && (
                    <>
                        {!item.read && (
                            <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={() => handleMarkAsRead(item.id, item.type)}>
                                <Text style={styles.buttonText}>Read</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={() => handleDeleteNotification(item.id, item.type)}>
                            <Text style={styles.buttonText}>Delete</Text>
                        </TouchableOpacity>
                        {/* <TouchableOpacity style={[styles.button, styles.followButton]} onPress={() => handleFollow(item.isFollowing, item.followerId)}>
                            <Text style={styles.buttonText}>{item.isFollowing ? "Following" : "Follow"}</Text>
                        </TouchableOpacity> */}
                    </>
                )}
                {item.notificationType === "room_invite" && (
                    <>
                        <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={() => handleAcceptInvite(item.shortCode, item.id)}>
                            <Text style={styles.buttonText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.declineButton]} onPress={() => handleDeclineInvite(item.roomId)}>
                            <Text style={styles.buttonText}>Decline</Text>
                        </TouchableOpacity>
                    </>
                )}
                {item.notificationType !== "room_invite" && item.notificationType !== "follow" && (
                    <>
                        {!item.read && (
                            <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={() => handleMarkAsRead(item.id, item.type)}>
                                <Text style={styles.buttonText}>Read</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={() => handleDeleteNotification(item.id, item.type)}>
                            <Text style={styles.buttonText}>Delete</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.backgroundColor,
            paddingTop: 20,
        },
        listContainer: {
            flexGrow: 1,
            marginHorizontal: 12, // Optional: adjust as needed
        },
        avatar: {
            width: 40,
            height: 40,
            borderRadius: 20,
            marginRight: 12, // Increase margin to separate from text
        },
        notificationItem: {
            flexDirection: "row", // Ensure items are in a row
            alignItems: "flex-start", // Align items at the start of the container
            marginBottom: 16,
            padding: 12,
            paddingVertical: 20,
            borderRadius: 8, // Added border radius for rounded corners
            backgroundColor: "#f0f0f0", // Light gray background for all notifications
        },
        notificationContent: {
            flex: 1, // Take up available space
            width: "100%",
        },
        notificationText: {
            fontSize: 16,
            color: "#333",
            flexWrap: "wrap", // Wrap text if necessary
        },
        boldText: {
            fontWeight: "bold",
        },
        readText: {
            color: "#888",
        },
        unreadText: {
            fontWeight: "bold",
        },
        buttonContainer: {
            flexDirection: "row",
            justifyContent: "flex-end",
            marginTop: 8,
        },
        button: {
            padding: 8,
            borderRadius: 4,
            marginLeft: 8,
        },
        followButton: {
            backgroundColor: "#007bff",
        },
        acceptButton: {
            backgroundColor: "#28a745",
        },
        declineButton: {
            backgroundColor: "#dc3545",
        },
        deleteButton: {
            backgroundColor: "#ed4337",
        },
        buttonText: {
            color: "#fff",
            fontWeight: "bold",
        },
        noNotificationsContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
        },
        noNotificationsText: {
            fontSize: 18,
            color: "#888",
            paddingBottom: 50,
        },
        sectionHeader: {
            fontSize: 18,
            fontWeight: "bold",
            marginVertical: 10,
            marginLeft: 10,
            color: theme.textColor,
        },
        clearButton: {
            backgroundColor: "#4a42c0",
            padding: 10,
            borderRadius: 5,
            alignItems: "center",
            marginVertical: 20,
        },
        divider: {
            height: 1,
            backgroundColor: "#ccc",
            marginVertical: 8,
        },
        unreadBorder: {
            borderLeftColor: "#4a42c0", // Purple color for unread notifications
            borderLeftWidth: 5, // Adjust width as needed
        },
    });

    return (
        <View style={styles.container} >
            <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}>
                {notifications.length === 0 ? (
                    <View style={styles.noNotificationsContainer}>
                        <Text style={styles.noNotificationsText}>You have no notifications at the moment</Text>
                    </View>
                ) : (
                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                        {Object.keys(categorizedNotifications).map(
                            (category) =>
                                categorizedNotifications[category].length > 0 && (
                                    <View key={category}>
                                        <Text style={styles.sectionHeader}>{category === "today" ? "Today" : category === "yesterday" ? "Yesterday" : category === "lastWeek" ? "Last Week" : "Older Notifications"}</Text>
                                        <FlatList data={categorizedNotifications[category]} renderItem={renderNotificationItem} keyExtractor={(item) => item.id.toString()} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} />
                                    </View>
                                )
                        )}
                    </ScrollView>
                )}
            </ScrollView>
            <BottomHeader userInfo={userInfo} />
        </View>
    );
};

export default Notifications;
