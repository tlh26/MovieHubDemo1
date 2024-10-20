import React, { useState, useEffect, useRef, useCallback } from "react";
import { StyleSheet, Text, View, StatusBar, Animated, Platform, Image, Dimensions, FlatList, Pressable, LogBox, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../styles/ThemeContext";
import { colors, themeStyles } from "../styles/theme";
import FastImage from 'react-native-fast-image';
import Svg from "react-native-svg";
import MovieCard from "../Components/MovieCard"
import TrendingMovie from "../Components/TrendingMovies"
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getMovies } from "../api";
import { getFriendsContent } from "../Services/ExploreApiService";
import { getLikesOfReview, getLikesOfPost } from "../Services/LikesApiService";
import { getCommentsOfPost, getCommentsOfReview, getCountCommentsOfPost, getCountCommentsOfReview } from "../Services/PostsApiServices";
import { getFollowedUsersWatchlists } from "../Services/ListApiService"
import BottomHeader from "../Components/BottomHeader";
import Genres from "../Components/Genres";
import Rating from "../Components/Rating";
import HomeHeader from "../Components/HomeHeader";
import moment from "moment";
import { getPopularMovies, getMoviesByGenre, getMovieDetails, getNewMovies, getTopPicksForToday, fetchClassicMovies, fetchCurrentlyPlayingMovies } from '../Services/TMDBApiService';
import { getUserProfile, getFollowingCount, getFollowersCount } from "../Services/UsersApiService";
import { getUserWatchlists } from "../Services/UsersApiService";

LogBox.ignoreLogs(["Warning: ..."]); // Ignore log notification by message
LogBox.ignoreAllLogs(); //Ignore all log notifications

const { width, height } = Dimensions.get("window");
const SPACING = 10;
const ITEM_SIZE = Platform.OS === "ios" ? width * 0.72 : width * 0.74;
const EMPTY_ITEM_SIZE = (width - ITEM_SIZE) / 2;
const BACKDROP_HEIGHT = height * 0.65;
const AnimatedSvg = Animated.createAnimatedComponent(Svg);

const genres = {
    Action: 28,
    Animation: 16,
    Comedy: 35,
    Crime: 80,
    Drama: 18,
    Family: 10751,
    Fantasy: 14,
    History: 36,
    Horror: 27,
    Mystery: 9648,
    Romance: 10749,
    'Sci-Fi': 878,
    Thriller: 53
};

const Loading = () => (
    <View style={[styles.loadingContainer]}>
        <Text style={styles.paragraph}>Loading...</Text>
    </View>
);

const Backdrop = ({ movies, scrollX }) => {
    const { theme } = useTheme();

    return (
        <View style={{ height: BACKDROP_HEIGHT, width, position: "absolute" }}>
            <FlatList
                data={movies}
                keyExtractor={(item) => item.key + "-backdrop"}
                removeClippedSubviews={false}
                contentContainerStyle={{ width, height: BACKDROP_HEIGHT }}
                renderItem={({ item, index }) => {
                    if (!item.backdrop) {
                        return null;
                    }

                    const translateX = scrollX.interpolate({
                        inputRange: [(index - 2) * ITEM_SIZE, (index - 1) * ITEM_SIZE],
                        outputRange: [0, width],
                    });

                    return (
                        <Animated.View removeClippedSubviews={false} style={{ position: "absolute", width: translateX, height, overflow: "hidden" }}>
                            <Image
                                source={{ uri: item.backdrop }}
                                style={{
                                    width,
                                    height: BACKDROP_HEIGHT,
                                    position: "absolute",
                                }}
                            />
                        </Animated.View>
                    );
                }}
            />
            <LinearGradient
                colors={["rgba(0, 0, 0, 0)", theme.backgroundColor]}
                style={{
                    height: BACKDROP_HEIGHT,
                    width,
                    position: "absolute",
                    bottom: 0,
                }}
            />
        </View>
    );
};

const VirtualizedList = ({ children, refreshControl }) => {
    return <FlatList
        data={[]}
        keyExtractor={() => "key"}
        renderItem={null}
        ListHeaderComponent={<>{children}</>}
        refreshControl={refreshControl}
    />;
};

const formatDate = (date) => {
    return moment(date).fromNow();
};

const Home = ({ route }) => {
    const flatlistRef = useRef(null);
    const screenWidth = Dimensions.get("window").width;
    const [activeIndex, setActiveIndex] = useState(0);
    const { userInfo } = route.params;
    const { theme } = useTheme();
    const { avatar } = route.params;
    const navigation = useNavigation();
    const [userProfile, setUserProfile] = useState(null);
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const scrollX = useRef(new Animated.Value(0)).current;
    const [movies1, setMovies1] = useState([]);
    const [thrillerMovies, setThrillerMovies] = useState([]);
    const [comedyMovies, setComedyMovies] = useState([]);
    const [romanceMovies, setRomanceMovies] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [moviesByGenre, setMoviesByGenre] = useState({});
    const [isAutoScrolling, setIsAutoScrolling] = useState(true);
    const [watchlists, setWatchlists] = useState([]);

    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    const fetchAllMovieData = useCallback(async () => {
        try {
            const [
                popularMovies,
                thrillerMoviesData,
                comedyMoviesData,
                actionMoviesData,
                watchlistsData,
                newMoviesData,
            ] = await Promise.all([
                getPopularMovies(),
                getMoviesByGenre(53), // Thriller
                getMoviesByGenre(35), // Comedy
                getMoviesByGenre(28), // Action
                getFollowedUsersWatchlists(userInfo.userId),
                getMovies(),
            ]);

            setMovies1(popularMovies);
            setThrillerMovies(thrillerMoviesData);
            setComedyMovies(comedyMoviesData);
            setRomanceMovies(actionMoviesData);
            setWatchlists(watchlistsData);
            
            const shuffledMovies = shuffleArray(newMoviesData);
            setMovies([{ key: "empty-left" }, ...shuffledMovies.slice(0, 9), { key: "empty-right" }]);

            const genreMoviesPromises = Object.entries(genres).map(([genreName, genreId]) =>
                getNewMovies(genreId)
            );
            const fetchedGenreMovies = await Promise.all(genreMoviesPromises);
            const moviesByGenreData = Object.keys(genres).reduce((acc, genreName, index) => {
                acc[genreName] = fetchedGenreMovies[index];
                return acc;
            }, {});
            setMoviesByGenre(moviesByGenreData);

            setLoading(false);
        } catch (error) {
            console.error('Error fetching movie data:', error);
            setLoading(false);
        }
    }, [userInfo.userId]);

    useFocusEffect(
        useCallback(() => {
            fetchAllMovieData();
            
            const intervalId = setInterval(() => {
                fetchAllMovieData();
            }, 300000);

            return () => clearInterval(intervalId);
        }, [fetchAllMovieData])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchAllMovieData();
        setRefreshing(false);
    }, [fetchAllMovieData]);

    const handleScrollEndDrag = () => {
        setTimeout(() => {
            setIsAutoScrolling(true);
            setActiveIndex(0);
            flatlistRef.current?.scrollToIndex({
                index: 0,
                animated: true,
            });
        }, 3000); 
    };

    const handleScroll = (event) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = scrollPosition / screenWidth;
        setActiveIndex(index);
    };

    if (loading) {
        return <Loading />;
    }

    const homeStyles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.backgroundColor,
        },
        sectionTitle: {
            color: theme.textColor,
            fontSize: 24,
            fontWeight: "bold",
            marginBottom: 10,
            textAlign: "center",
        },
    });

    const goToWatchlistDetails = (watchlist) => {
        navigation.navigate('WatchlistDetails', { userInfo, watchlist });
    };

    const renderItem = ({ item }) => (
        <MovieCard
            movieId={item.id}
            imageUrl={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
            title={item.title}
            overview={item.overview}
            rating={item.vote_average.toFixed(1)}
            date={new Date(item.release_date).getFullYear()}
            imageComponent={
                <FastImage
                    style={{ width: 100, height: 150 }}
                    source={{ uri: `https://image.tmdb.org/t/p/w500${item.poster_path}` }}
                    resizeMode={FastImage.resizeMode.cover}
                />
            }
            userInfo={userInfo}
        />
    );

    return (
        <View style={homeStyles.container}>
            <VirtualizedList
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.primaryColor]}
                    />
                }
            >
                <View style={homeStyles.container}>
                    <HomeHeader userInfo={userInfo} />
                    <Backdrop movies={movies} scrollX={scrollX} />
                    <StatusBar hidden />
                    <Animated.FlatList
                        showsHorizontalScrollIndicator={false}
                        data={movies}
                        keyExtractor={(item) => item.key}
                        horizontal
                        bounces={false}
                        decelerationRate={Platform.OS === "ios" ? 0 : 0.98}
                        renderToHardwareTextureAndroid
                        contentContainerStyle={{ alignItems: "center", paddingBottom: 30 }}
                        snapToInterval={ITEM_SIZE}
                        snapToAlignment="start"
                        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
                        scrollEventThrottle={16}
                        renderItem={({ item, index }) => {
                            if (!item.poster) {
                                return <View style={{ width: EMPTY_ITEM_SIZE }} />;
                            }

                            const inputRange = [(index - 2) * ITEM_SIZE, (index - 1) * ITEM_SIZE, index * ITEM_SIZE];

                            const translateY = scrollX.interpolate({
                                inputRange,
                                outputRange: [55, 0, 55],
                                extrapolate: "clamp",
                            });

                            const movieDetails = {
                                movieId: item.key,
                                imageUrl: item.poster,
                                title: item.title,
                                rating: item.rating,
                                overview: item.description,
                                date: new Date(item.releaseDate).getFullYear(),
                            };

                            return (
                                <View style={{ width: ITEM_SIZE, paddingBottom: 0 }}>
                                    <Pressable onPress={() => navigation.navigate("MovieDescriptionPage", { ...movieDetails, userInfo })}>
                                        <Animated.View
                                            style={{
                                                marginHorizontal: SPACING,
                                                padding: SPACING * 2,
                                                alignItems: "center",
                                                transform: [{ translateY }],
                                                backgroundColor: theme.backgroundColor,
                                                borderRadius: 34,
                                            }}>
                                            <Image source={{ uri: item.poster }} style={styles.posterImage} />
                                            <Text style={{ fontSize: 24, color: theme.textColor }} numberOfLines={1}>
                                                {item.title}
                                            </Text>
                                            <Rating rating={item.rating} />
                                            <Genres genres={item.genres} />
                                            <Text style={{ fontSize: 12, color: theme.textColor }} numberOfLines={3}>
                                                {item.description}
                                            </Text>
                                            <Pressable onPress={() => navigation.navigate("MovieDescriptionPage", { ...movieDetails })}>
                                                <Text style={{ fontSize: 12, fontWeight: "500", color: theme.primaryColor, marginTop: 10 }}>Read more</Text>
                                            </Pressable>
                                        </Animated.View>
                                    </Pressable>
                                </View>
                            );
                        }}
                    />

                    <View style={styles.line}></View>

                    <View style={styles.viewall}>
                        <Text style={{
                            fontSize: 23, 
                            color: theme.textColor,
                            paddingLeft: 16,
                            fontFamily: 'Roboto',
                            fontWeight: 'bold',
                            paddingTop: 10,
                        }}>Comedy</Text>
                    </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {comedyMovies.length > 0 && comedyMovies.slice(5, 16).map((movie, index) => (

                            <TrendingMovie
                                key={index}
                                movieId={movie.id}
                                imageUrl={`https://image.tmdb.org/t/p/w500/${movie.poster_path}`}
                                title={movie.title}
                                overview={movie.overview}
                                rating={movie.vote_average.toFixed(1)}
                                date={new Date(movie.release_date).getFullYear()}
                                userInfo={userInfo}
                            />
                        ))}

            </ScrollView>

            {watchlists && watchlists.length > 0 ? (
            <View style={styles.viewall}>
             <Text  style={{
                fontSize: 23, // Ensure only one fontSize is set
                color: theme.textColor,
                paddingLeft: 16, // Padding should work
                fontFamily: 'Roboto',
                fontWeight: 'bold',
                paddingTop: 10,
                paddingBottom: 10,
                textAlign: "center",
            }}>Watchlists</Text>
             {/* <Text style={styles.viewalltext}>View all</Text> */}
            </View>
            ) : null}
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {watchlists.map((watchlist, index) => (
                    <TouchableOpacity key={`${watchlist.id}-${index}`} style={styles.watchlistItem} onPress={() => goToWatchlistDetails(watchlist)}>
                        {loading && (
                <ActivityIndicator
                    size="small"
                    color={colors.primary}
                    style={{ position: 'absolute', top: '50%', left: '50%', zIndex: 1 }} // Adjust position if necessary
                />
                        )}
                        <Image source={{ uri: watchlist.img ? watchlist.img : 'https://picsum.photos/seed/picsum/20/300' }} style={styles.watchlistImage} onLoadEnd={() => setLoading(false)}/>
                        <View style={styles.watchlistInfo}>
                            <Text style={{
                fontSize: 12,
                color: theme.textColor, 
                fontFamily: 'Roboto',
                fontWeight: 'bold',
                paddingTop: 10,
                paddingBottom: 10,
                textAlign: "center",
            }} numberOfLines={1} // Limits the text to 1 line
            ellipsizeMode="tail" 
            >{watchlist.name}</Text>
                        </View>
                       
                    </TouchableOpacity>
                ))}
            </ScrollView>
            

            <View style={styles.viewall}>
                        <Text  style={{
                fontSize: 23, // Ensure only one fontSize is set
                color: theme.textColor,
                paddingLeft: 16, // Padding should work
                fontFamily: 'Roboto',
                fontWeight: 'bold',
                paddingTop: 10,
            }}>Action</Text>
             {/* <Text style={styles.viewalltext}>View all</Text> */}
            </View>


            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {romanceMovies.slice(0, 10).map((movie, index) => (

                            <TrendingMovie
                                key={index}
                                movieId={movie.id}
                                imageUrl={`https://image.tmdb.org/t/p/w500/${movie.poster_path}`}
                                title={movie.title}
                                overview={movie.overview}
                                rating={movie.vote_average.toFixed(1)}
                                date={new Date(movie.release_date).getFullYear()}
                                userInfo={userInfo}
                            />
                        ))}
            </ScrollView>

            <Text  style={{
                fontSize: 23, // Ensure only one fontSize is set
                color: theme.textColor,
                paddingLeft: 16, // Padding should work
                fontFamily: 'Roboto',
                fontWeight: 'bold',
                paddingTop: 10,
            }}>Just for you </Text>

            <View style={styles.container1}>

            <FlatList
            data={movies1.slice(0, 10)}
            ref={flatlistRef}
            keyExtractor={(item) => item.id.toString()} // Use movie ID as key
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 0 }} // Optional: Adjust spacing
            onScroll={handleScroll}
            // onScrollBeginDrag={handleScrollBeginDrag}
            // onScrollEndDrag={handleScrollEndDrag}
            // getItemLayout={getItemLayout}
            // onScrollToIndexFailed={handleScrollToIndexFailed}

        />
            </View>   

            <ScrollView>
      {Object.keys(genres).map((genreName, index) => (
        <View key={index}>
          <View style={styles.viewall}>
            <Text style={{
                fontSize: 23, // Ensure only one fontSize is set
                color: theme.textColor,
                paddingLeft: 16, // Padding should work
                fontFamily: 'Roboto',
                fontWeight: 'bold',
                paddingTop: 10,
            }}>{genreName}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {moviesByGenre[genreName]?.slice(0, 10).map((movie, index) => (
              <TrendingMovie
                key={index}
                movieId={movie.id}
                imageUrl={`https://image.tmdb.org/t/p/w500/${movie.poster_path}`}
                title={movie.title}
                overview={movie.overview}
                rating={movie.vote_average.toFixed(1)}
                date={new Date(movie.release_date).getFullYear()}
                userInfo={userInfo}
              />
            ))}
          </ScrollView>
        </View>
      ))}
    </ScrollView>

                </View>
            </VirtualizedList>
            <BottomHeader userInfo={userInfo} />
            {/* <CommentsModal ref={bottomSheetRef} isPost={isPost} postId={selectedPostId} userId={userInfo.userId} username={userInfo.username} currentUserAvatar={userProfile ? userProfile.avatar : null} comments={comments} loadingComments={loadingComments} onFetchComments={fetchComments} /> */}
        </View>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    paragraph: {
        margin: 24,
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
    },
    posterImage: {
        width: "100%",
        height: ITEM_SIZE * 1.2,
        resizeMode: "cover",
        borderRadius: 24,
        margin: 0,
        marginBottom: 10,
    }, 
    watchlistName: {
        fontSize: 12,
        fontWeight: "bold",
        textAlign: "center",
        paddingTop: 10,

    },line: {
        borderBottomColor: 'transparent', 
        borderBottomWidth: 1,        
        marginVertical: 10,    
        paddingTop: 10,       
      },watchlistImage: {
        width: 182,
        height: 180,
        borderRadius: 8,
        marginRight: 16,
        objectFit: "cover",
        marginLeft: 10,
    },
    justforyou: {
        // textAlign: 'center',
        fontFamily: 'Roboto',
        color: '#000000',
        fontSize: 20,
        fontWeight: 'bold',

    },
    friendsContent: {
        paddingVertical: 4,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 10,
        textAlign: "center",
    },
    trending :{
        paddingLeft:16,
        paddingTop: 2,
        fontFamily: 'Roboto',
        color: useTheme.textColor,
        fontSize: 23,
        fontWeight: 'bold',
        paddingTop: 10,
    },

    viewall: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: 10,
        paddingTop: 10,
        backgroundColor: '#fffff',
    },

    viewalltext: {
        fontFamily: 'Roboto',
    },
    container1: {
        position: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fffff',
        paddingTop: 10,
    },


});

export default Home;