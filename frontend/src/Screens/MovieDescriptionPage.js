import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, Text, View, ScrollView, Image, SafeAreaView, StatusBar, ActivityIndicator, TouchableOpacity, Modal, Button, FlatList, Pressable } from "react-native";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { getMovieCredits, getMovieRuntime, getMovieDetails,getMovieDetailsByName } from "../Services/TMDBApiService";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../styles/ThemeContext";
import Icon from "react-native-vector-icons/MaterialIcons";
import { Ionicons, Octicons, FontAwesome6, FontAwesome, SimpleLineIcons } from "@expo/vector-icons";
import { getLocalIP } from "../Services/getLocalIP";
import { getRecommendedMovies } from "../Services/RecApiService"; // Importing the recommendation service
import { getUserWatchlists } from "../Services/UsersApiService";
import { getReviewsOfMovie } from "../Services/PostsApiServices";
import { getWatchlistDetails } from "../Services/ListApiService";

import Cast from "../Components/Cast";
import moment from "moment";
import axios from "axios";

export default function MovieDescriptionPage({ route }) {
    const localIP = getLocalIP();
    const { theme } = useTheme();
    const { userInfo } = route.params;
    const { movieId, imageUrl, title, rating, overview, date } = route.params;
    const [colors, setColors] = useState([
        "rgba(0, 0, 0, 0.7)", // Fallback to white if colors not loaded
        "rgba(0, 0, 0, 0.7)",
        "rgba(0, 0, 0, 0.7)",
    ]); // Initial state with three colors, can be replaced with initial color values

    const [credits, setCredits] = useState({ cast: [], crew: [] });
    const [loading, setLoading] = useState(true);
    const [isAddedToList, setIsAddedToList] = useState(false);
    const [isWatched, setIsWatched] = useState(false);
    const [runtime, setRuntime] = useState({ hours: 0, mins: 0 });
    const [isReviewed, setIsReviewed] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [watchlistModalVisible, setWatchlistModalVisible] = useState(false);
    const [recommendedMovies, setRecommendedMovies] = useState([]); // State for recommended movies
    const [watchlists, setWatchlists] = useState([]);
    const [movieReviews, setMovieReviews] = useState([]);
    const navigation = useNavigation();
    const [movieData, setMovieData] = useState();

    useEffect(() => {
        const fetchUserWatchlists = async () => {
            try {
                const userId = userInfo.userId;
                let userWatchlists = await getUserWatchlists(userId);

                // Remove duplicates based on watchlist IDs
                userWatchlists = userWatchlists.filter((watchlist, index, self) => index === self.findIndex((w) => w.id === watchlist.id));
                console.log("User watchlists:", userWatchlists);
                setWatchlists(userWatchlists);
            } catch (error) {
                console.error("Error fetching user watchlists:", error);
                setWatchlists([]);
            }
        };

        fetchUserWatchlists();
    }, []);

    const handleReviewPress = () => {
        navigation.navigate("CreatePost", { 
            userInfo,
            isReview: true,
            movieId: movieId,
            movieTitle: title,
            imageUrl: imageUrl,
            rating: rating,
            date: date,
            overview: overview
        });
        setIsReviewed(true);
    };

    const handleAddPress = () => {
        setIsModalVisible(true);
        // alert with three options
    };

    const handleLogBookPress = () => {
        navigation.navigate("LogBookScreen", { title });
    };

    const handleCreateNewWatchlist = () => {
        //   console.log("Look ", userInfo)
        navigation.navigate("CreateWatchlist", { userInfo });
        setIsModalVisible(false);
    };


    const handleWatchPartyPress = () => {
        navigation.navigate("WatchParty", { userInfo });
    };

    const handleSelectWatchlist = async (watchlist) => {
        console.log(watchlist);
        try {
            const data = await getWatchlistDetails(watchlist.id);
            console.log(data.movieList);
            navigation.navigate("AddMovies", { route,  userInfo, addedMovies: data.movieList });
        } catch (error) {
            console.error("Error fetching watchlist details:", error);
        }
    };

    useEffect(() => {
        const fetchCredits = async () => {
            const data = await getMovieCredits(movieId);
            setCredits(data);
        };
        fetchCredits();
    }, [movieId]);

    useEffect(() => {
        const fetchRuntime = async () => {
            try {
                const minutes = await getMovieRuntime(movieId);
                // Convert minutes to hours and minutes
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                setRuntime({ hours, mins });
            } catch (error) {
                console.error("Error fetching runtime:", error);
            }
        };

        fetchRuntime();
    }, [movieId]);

    useEffect(() => {
        const fetchColors = async () => {
            try {
                const response = await axios.post(
                    `http://${localIP}:3000/extract-colors`,
                    { imageUrl },
                    {
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }
                );

                // Convert RGB arrays to rgba strings
                const convertedColors = response.data.colors.slice(0, 3).map((color) => `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1)`);
                setColors(convertedColors);
            } catch (error) {
                console.error("Error fetching colors:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchColors();
    }, [imageUrl]);

    useEffect(() => {
        // Fetch recommended movies based on the current movie's genre or similarity score
        const fetchRecommendedMovies = async () => {
            try {
                const recommendations = await getRecommendedMovies(movieId, userInfo.userId);
                setRecommendedMovies(recommendations);
            } catch (error) {
                console.error("Error fetching recommended movies:", error);
            }
        };
        fetchRecommendedMovies();
    }, [movieId]);

    const fetchMovie = async (movieId) => {
        setLoading(true);
        try {
            const movieData = await getMovieDetails(movieId);
            setLoading(false);
            navigation.navigate("MovieDescriptionPage", {
                movieId: movieData.id,
                imageUrl: `https://image.tmdb.org/t/p/w500/${movieData.poster_path}`,
                title: movieData.title,
                overview: movieData.overview,
                rating: movieData.vote_average.toFixed(1),
                date: new Date(movieData.release_date).getFullYear(),
                userInfo,
            });
        } catch (error) {
            console.error("Error fetching movie details:", error);
            setLoading(false); // Stop loading if an error occurs
        }
    };

    const handleRecommendationPress = (movie) => {
        const movieid = movie.id;
        fetchMovie(movieid);
        console.log("Movie pressed:", movie);
    };

    const fetchMovieReviews = useCallback(async () => {
        try {
            const reviews = await getReviewsOfMovie(movieId);
            setMovieReviews(reviews.data);
            console.log("Fetched reviews:", reviews);
        } catch (error) {
            console.error("Error fetching movie reviews:", error);
        }
    }, [movieId]);

    useFocusEffect(
        useCallback(() => {
            const unsubscribe = navigation.addListener('focus', () => {
                // Check if we're coming back from adding a new review
                if (route.params?.newReviewAdded) {
                    fetchMovieReviews();
                    // Reset the flag
                    navigation.setParams({ newReviewAdded: false });
                }
            });

            return unsubscribe;
        }, [navigation, route.params, fetchMovieReviews])
    );

    useEffect(() => {
        fetchMovieReviews();
    }, [fetchMovieReviews]);

    // useEffect(() => {
    //     const fetchMovieReviews = async () => {
    //         try {
    //             const reviews = await getReviewsOfMovie(movieId);
    //             setMovieReviews(reviews.data);
    //             console.log("reviews", reviews);
    //         } catch (error) {
    //             console.error("Error fetching movie reviews:", error);
    //         }
    //     };
    //     fetchMovieReviews();
    // }, []);

    const renderReview = (review, index) => {
        // convert date to mmm//yyyy using moment
        const date = moment(review.createdAt).format("LL");

        return (
            <View key={index} style={styles.reviewContainer}>
                <View style={styles.reviewHeader}>
                    <Image source={{ uri: review.avatar }} style={styles.reviewAvatar} />
                    <View style={styles.reviewInfo}>
                        <View style={styles.reviewTitleRow}>
                            <Text style={styles.reviewTitle}>{review.reviewTitle}</Text>
                            <View style={styles.ratingContainer}>
                                <Icon name="star" size={22} color="gold" />
                                <Text style={styles.ratingText}>{review.rating}</Text>
                            </View>
                        </View>
                        <Text style={styles.reviewUsername}>
                            By <Text style={{ fontWeight: "bold" }}>{review.username}</Text> on {date}
                        </Text>
                    </View>
                </View>
                <Text style={styles.reviewText}>{review.text}</Text>
            </View>
        );
    };

    const director = credits?.crew?.find((person) => person.job === "Director") || "Unknown Director";
    const cast = credits?.cast
  ? credits?.cast?.slice(0, 5).map((person) => person.name).join(", ")
  : "Cast information not available";

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            width: "100%",
        },
        content: {
            flex: 1,
            paddingTop: 65,
            width: "100%",
        },
        scrollContent: {
            flexGrow: 1,
        },
        activityIndicator: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
        },
        wholecontainer: {
            alignItems: "center",
            paddingTop: 5,
            paddingBottom: 50,
        },
        iconTextContainer: {
            width: 79,
            alignItems: "center",
            // justifyContent: "space-evenly",
        },
        icons: {
            paddingTop: 30,
            paddingLeft: 12,
            paddingBottom: 10,
            flexDirection: "row", // Align icons horizontally
            justifyContent: "space-between", // Space icons evenly
            alignItems: "center", // Align items vertically
            width: "100%", // Ensure full width for proper spacing
            paddingHorizontal: 20, // Add some padding on the sides
        },
        iconsContent: {
            flexDirection: "row",
        },
        icon: {
            paddingLeft: 0,
        },
        text: {
            // paddingLeft: 0,
            color: "white",
            fontWeight: "bold",
        },
        card: {
            paddingTop: 20,
            padding: 10,
            height: 430,
            width: "100%",
        },
        image: {
            width: "100%",
            height: "115%",
            objectFit: "contain",
            shadowOffset: {
                width: 0,
                height: 3,
            },
            shadowOpacity: 0.5,
            shadowRadius: 3.84,
            elevation: 5,
        },
        movieinfo: {
            flex: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            padding: 20,
        },
        movieinfo2: {
            flex: 1,
            flexDirection: "row",
            paddingLeft: 12,
        },
        movietitle: {
            fontSize: 30,
            fontWeight: "bold",
            textAlign: "left",
            color: "white",
            width: "70%",
        },
        movieRating: {
            fontSize: 23,
            fontWeight: "bold",
            textAlign: "center",
            color: "white",
            paddingTop: 7,
        },
        movietitle2: {
            paddingLeft: 10,
            fontSize: 16,
            fontWeight: "bold",
            textAlign: "center",
            color: "white",
        },
        moviebio: {
            paddingTop: 20,
            paddingLeft: 20,
            color: "white",
        },
        moviebiotext: {
            fontSize: 15,
            paddingRight: 10,
            color: "white",
        },
        castContainer: {
            flexDirection: "row",
        },
        moviecast: {
            paddingTop: 20,
            fontSize: 25,
            paddingLeft: 15,
            fontWeight: "bold",
            color: "white",
        },
        bold: {
            fontWeight: "bold",
            fontSize: 15,
            color: "white",
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
        },
        modalContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
        },
        modalView: {
            margin: 20,
            backgroundColor: theme.backgroundColor,
            borderRadius: 20,
            padding: 35,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
        },
        modalButton: {
            padding: 10,
            alignItems: "center",
            marginTop: 8,
            // backgroundColor: "#4a42c0",
        },
        recommendedTitle: {
            fontSize: 24,
            fontWeight: "bold",
            color: "white",
            paddingLeft: 15,
            paddingTop: 20,
            paddingBottom: 15,
        },
        recommendationContainer: {
            paddingLeft: 15,
        },
        recommendationCard: {
            width: 120,
            marginRight: 15,
        },
        recommendationImage: {
            width: 120,
            height: 180,
            borderRadius: 10,
        },
        recommendationTitle: {
            fontSize: 14,
            color: "white",
            marginTop: 5,
            paddingTop: 10,
        },
        recommendationScore: {
            fontSize: 12,
            color: "lightgray",
        },
        reviewsTitle: {
            fontSize: 24,
            fontWeight: "bold",
            color: "white",
            paddingLeft: 15,
            paddingTop: 20,
            paddingBottom: 10,
        },
        reviewContainer: {
            paddingHorizontal: 15,
            paddingVertical: 7,
        },
        reviewHeader: {
            flexDirection: "row",
            alignItems: "center",
        },
        reviewAvatar: {
            width: 40,
            height: 40,
            borderRadius: 20,
            marginRight: 10,
        },
        reviewInfo: {
            flex: 1,
            paddingTop: 5,
        },
        reviewTitleRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 5,
        },
        reviewTitle: {
            fontSize: 18,
            fontWeight: "bold",
            color: "white",
            flex: 1,
        },
        ratingContainer: {
            flexDirection: "row",
            alignItems: "center",
            marginLeft: 10,
        },
        ratingText: {
            color: "white",
            marginLeft: 5,
        },
        reviewUsername: {
            color: "white",
            fontSize: 14,
        },
        reviewText: {
            color: "white",
            marginTop: 10,
        },
        noReviewsText: {
            color: "white",
            fontSize: 16,
            textAlign: "center",
            marginBottom: 50,
            fontStyle: "italic",
        },
        writeReviewText: {
            fontWeight: 'bold',
            fontStyle: 'italic',
        }
    });

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color="#4A42C0" style={styles.activityIndicator} />
            </SafeAreaView>
        );
    }

    // round of rating to 1 decimal place
    const roundedRating = Math.round(rating * 10) / 10;

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" />

            <LinearGradient colors={colors} style={styles.content}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.wholecontainer}>
                        <View style={styles.card}>
                            <Image source={{ uri: imageUrl }} style={styles.image} />
                        </View>
                    </View>
                    <View style={styles.moviedes}>
                        <View style={styles.movieinfo}>
                            <Text style={styles.movietitle}>{title}</Text>
                            <Text style={styles.movieRating}>
                                {roundedRating}/<Text style={{ fontSize: 18 }}>10</Text>
                            </Text>
                        </View>
                        <View style={styles.movieinfo2}>
                            <Text style={styles.movietitle2}>{date} </Text>

                            <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}> &bull; </Text>
                            <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}> {runtime ? `${runtime.hours > 0 ? `${runtime.hours} h ` : ""}${runtime.mins} mins` : "NoN"}</Text>
                        </View>
                        <View style={styles.icons}>
                            <TouchableOpacity onPress={handleAddPress} style={styles.block1}>
                                <View style={styles.iconTextContainer}>
                                    <FontAwesome6 name={isAddedToList ? "check" : "add"} size={24} color="white" style={styles.icon} />
                                    <Text style={styles.text}>{isAddedToList ? "Added" : "Add to list"}</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.block3} onPress={handleLogBookPress}>
                                <View style={styles.iconTextContainer}>
                                    <Ionicons name="book-outline" size={24} color="white" style={styles.icon} />
                                    <Text style={styles.text}>Log Movie</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.block3} onPress={handleReviewPress}>
                                <View style={styles.iconTextContainer}>
                                    <Ionicons name="star-outline" size={24} color={isReviewed ? "gold" : "white"} style={styles.icon} />
                                    <Text style={styles.text}>{isReviewed ? "Reviewed" : "Review"}</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.block4} onPress={handleWatchPartyPress}>
                                <View style={styles.iconTextContainer}>
                                    <SimpleLineIcons name="screen-desktop" size={24} color="white" style={styles.icon} />
                                    <Text style={styles.text}>Watch Party</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.moviebio}>
                            <Text style={styles.moviebiotext}>{overview}</Text>
                        </View>
                        <View>
                        {cast ? (
                                <Text style={styles.moviebio}>
                                    <Text style={styles.bold}>Starring:</Text> {cast}
                                </Text>
                                ) : null}
                            <Text style={styles.moviebio}>
                                <Text style={styles.bold}>Directed by:</Text> {director ? director.name : "N/A"}
                            </Text>
                        </View>
                        {credits?.cast?.length > 0 && (
                            <>
                                <Text style={styles.moviecast}>Cast</Text>
                                <ScrollView horizontal contentContainerStyle={styles.castContainer} showsHorizontalScrollIndicator={false}>
                                {credits.cast.slice(0, 5).map((member, index) => (
                                    <Cast key={index} imageUrl={`https://image.tmdb.org/t/p/w500${member.profile_path}`} name={member.name} />
                                ))}
                                </ScrollView>
                            </>
                            )}
                        {/* Recommended Movies Section */}
                        {recommendedMovies.length > 0 && (
                            <>
                                <Text style={styles.recommendedTitle}>Recommended Movies</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendationContainer}>
                                    {recommendedMovies.map((movie, index) => (
                                        <TouchableOpacity key={index} style={styles.recommendationCard} onPress={() => handleRecommendationPress(movie)}>
                                            <Image source={{ uri: movie.posterUrl }} style={styles.recommendationImage} />
                                            <Text style={styles.recommendationTitle}>{movie.title}</Text>
                                            <Text style={styles.recommendationScore}>Similarity: {movie.similarity}%</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </>
                        )}

                        <View>
                            <Text style={styles.reviewsTitle}>Reviews</Text>
                            {movieReviews.length > 0 ? 
                                movieReviews.map((review, index) => renderReview(review, index)) : 
                                <Text style={styles.noReviewsText}>
                                    No reviews yet. Be the first one to{' '}
                                    <Text onPress={() => navigation.navigate('CreatePost', { userInfo })} style={styles.writeReviewText}>
                                        write a review
                                    </Text>
                                    {' '}about this movie!
                                </Text>
                            }
                        </View>
                    </View>
                </ScrollView>
            </LinearGradient>

            <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsModalVisible(false)}>
                    {/* <View style={styles.modalContainer}> */}
                    <View style={styles.modalView}>
                        <TouchableOpacity style={styles.modalButton} onPress={handleCreateNewWatchlist} color="#000">
                            <Text style={{ color: theme.textColor }}>Create a new watchlist</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.modalButton} onPress={() => setIsModalVisible(false)} color="#f44336">
                            <Text style={{ color: "red" }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                    {/* </View> */}
                </TouchableOpacity>
            </Modal>

            <Modal animationType="slide" transparent={true} visible={watchlistModalVisible} onRequestClose={() => setWatchlistModalVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setWatchlistModalVisible(false)}>
                    <View style={{ width: 300, backgroundColor: "white", borderRadius: 10, padding: 25 }}>
                        <FlatList
                            data={watchlists}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => handleSelectWatchlist(item)} style={{ flexDirection: "row", alignItems: "center", paddingBottom: 10, paddingTop: 8 }}>
                                    <Image source={{ uri: item.img }} style={{ width: 50, height: 60, marginRight: 15 }} />
                                    <Text style={{ padding: 10, fontSize: 18 }}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        {
                            watchlists.length === 0 && <Text>You have no watchlists</Text>
                        }
                        <TouchableOpacity style={{ position: "absolute", top: 10, right: 10 }} onPress={() => setWatchlistModalVisible(false)}>
                            <Text>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}
