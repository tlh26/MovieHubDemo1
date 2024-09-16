import { useNavigation, useFocusEffect } from "@react-navigation/native";
import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { getUserCreatedRooms, getUserParticipatedRooms, getPublicRooms, getRoomParticipantCount } from "../Services/RoomApiService";
import { useTheme } from "../styles/ThemeContext";
import MatIcon from "react-native-vector-icons/MaterialCommunityIcons";
import UserRoomCard from "../Components/UserRoomCard";

const HubScreen = ({ route }) => {
    const { userInfo } = route.params;
    const { theme } = useTheme();
    const navigation = useNavigation();
    const [createdRooms, setCreatedRooms] = useState([]);
    const [participatingRooms, setParticipatingRooms] = useState([]);
    const [publicRooms, setPublicRooms] = useState([]);
    const [loading, setLoading] = useState(true); // State to manage loading status
    const keywords = ["art", "city", "neon", "space", "movie", "night", "stars", "sky", "sunset", "sunrise"];

    const fetchRooms = useCallback(async () => {
        try {
            const createdRoomsData = await getUserCreatedRooms(userInfo.userId);
            const createdRoomsWithCounts = await Promise.all(
                createdRoomsData.map(async (room) => {
                    const countResponse = await getRoomParticipantCount(room.roomId);
                    return {
                        ...room,
                        participantsCount: countResponse.participantCount || 0,
                    };
                })
            );
            setCreatedRooms(createdRoomsWithCounts);

            const participatingRoomsData = await getUserParticipatedRooms(userInfo.userId);
            const participatingRoomsWithCounts = await Promise.all(
                participatingRoomsData.map(async (room) => {
                    const countResponse = await getRoomParticipantCount(room.roomId);
                    return {
                        ...room,
                        participantsCount: countResponse.participantCount || 0,
                    };
                })
            );
            setParticipatingRooms(participatingRoomsWithCounts);

            const publicRoomsData = await getPublicRooms();
            const publicRoomsWithCounts = await Promise.all(
                publicRoomsData.map(async (room) => {
                    const countResponse = await getRoomParticipantCount(room.roomId);
                    return {
                        ...room,
                        participantsCount: countResponse.participantCount || 0,
                    };
                })
            );
            setPublicRooms(publicRoomsWithCounts);
        } catch (error) {
            console.error("Failed to fetch rooms:", error);
        } finally {
            setLoading(false); // Set loading to false when data fetching is complete
        }
    }, [userInfo.userId]);

    useFocusEffect(
        useCallback(() => {
            fetchRooms();
        }, [fetchRooms])
    );

    const handleCreateRoom = ({ roomTitle, accessLevel, roomType, watchParty }) => {
        const newRoom = { roomTitle, accessLevel, roomType, watchParty, maxParticipants: 5 };
        navigation.navigate("HubScreen", { userInfo, newRoom });
    };

    const getRandomKeyword = () => {
        return keywords[Math.floor(Math.random() * keywords.length)];
    };

    const renderRoomCard = ({ item }) => (
        <UserRoomCard
            roomName={item.roomName}
            users={item.participantsCount}
            live={item.roomType !== "Chat-only"}
            keyword={getRandomKeyword()}
            handlePress={() => navigation.navigate("ViewRoom", { userInfo, isUserRoom: item.isUserRoom, roomId: item.roomId })}
            coverImage={item.coverImage}
        />
    );

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            paddingVertical: 16,
            backgroundColor: theme.backgroundColor,
        },
        header: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            paddingRight: 16,
            height: 50,
            paddingLeft: 16,
            backgroundColor: theme.backgroundColor,
        },
        headerLeft: {
            flexDirection: "row",
            alignItems: "center",
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: "bold",
            color: theme.textColor,
        },
        createRoomText: {
            fontSize: 16,
            color: "blue",
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 15,
            paddingLeft: 20,
            color: theme.textColor,
        },
        userRoomCard: {
            width: 310,
            height: 210,
            borderRadius: 8,
            marginHorizontal: 12,
            overflow: "hidden",
        },
        imageBackground: {
            flex: 1,
            justifyContent: "flex-end",
            borderRadius: 8,
        },
        cardBody: {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            position: "absolute",
            bottom: 12,
            left: 16,
            right: 16,
        },
        cardTitle: {
            fontSize: 18,
            fontWeight: "bold",
            color: theme.textColor,
        },
        roomList: {
            paddingHorizontal: 16,
        },
        divider: {
            height: 1,
            backgroundColor: theme.borderColor,
            marginVertical: 16,
        },
        emptyContainer: {
            alignItems: "center",
            marginVertical: 20,
        },
        emptyText: {
            fontSize: 16,
            color: theme.gray,
        },
        loadingIndicator: {
            marginTop: 30,
        },
    });

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <MatIcon name="arrow-left" size={24} color={theme.iconColor} style={{ marginRight: 35 }} onPress={() => navigation.goBack()} />
                    <Text style={styles.headerTitle}>The Hub</Text>
                </View>

                <TouchableOpacity onPress={() => navigation.navigate("CreateRoom", { userInfo, onRoomCreate: handleCreateRoom })}>
                    <Text style={styles.createRoomText}>Create room</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#4a42c0" style={styles.loadingIndicator} />
            ) : (
                <>
                    {createdRooms.length === 0 && participatingRooms.length === 0 && publicRooms.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>It's a bit quiet in here!</Text>
                            <Text style={styles.emptyText}>Why not start the fun by creating your first room?</Text>
                        </View>
                    )}

                    {createdRooms.length > 0 && (
                        <View>
                            <Text style={styles.sectionTitle}>Rooms You Created</Text>
                            <FlatList
                                data={createdRooms}
                                renderItem={renderRoomCard}
                                keyExtractor={(item) => item.roomId.toString()}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.roomList}
                            />
                            <View style={styles.divider} />
                        </View>
                    )}

                    {participatingRooms.length > 0 && (
                        <View>
                            <Text style={styles.sectionTitle}>Rooms You're Participating In</Text>
                            <FlatList
                                data={participatingRooms}
                                renderItem={renderRoomCard}
                                keyExtractor={(item) => item.roomId.toString()}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.roomList}
                            />
                            <View style={styles.divider} />
                        </View>
                    )}

                    {publicRooms.length > 0 && (
                        <View>
                            <Text style={styles.sectionTitle}>Public Rooms Available</Text>
                            <FlatList
                                data={publicRooms}
                                renderItem={renderRoomCard}
                                keyExtractor={(item) => item.roomId.toString()}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.roomList}
                            />
                            <View style={styles.divider} />
                        </View>
                    )}
                </>
            )}
        </ScrollView>
    );
};

export default HubScreen;
