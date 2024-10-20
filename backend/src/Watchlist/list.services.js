// backend/src/Watchlist/list.services.js
const neo4j = require('neo4j-driver');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const TmdbService = require('../services/tmdb.service');

const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

exports.createWatchlist = async (userId, watchlistData) => {
    console.log("In list.services");

    // Ensure all required parameters except collabUserIds (conditionally) are present
    const requiredParams = ['name', 'tags', 'visibility', 'ranked', 'description', 'collaborative', 'movies'];
    for (const param of requiredParams) {
        if (!(param in watchlistData)) {
            console.error(`Missing required parameter: ${param}`);
            throw new Error(`Expected parameter(s): ${requiredParams.join(', ')}`);
        }
    }

    const { collaborative, collabUserIds } = watchlistData;

    // If the watchlist is collaborative, ensure collabUserIds is provided
    if (collaborative && (!collabUserIds || collabUserIds.length === 0)) {
        console.error('Missing required parameter: collabUserIds for collaborative watchlist');
        throw new Error('collabUserIds are required for a collaborative watchlist');
    }

    const session = driver.session();
    const watchlistId = uuidv4();
    const { name, tags, visibility, ranked, description, movies, img } = watchlistData;

    try {
        console.log("All required parameters are present. Proceeding with database query.");

        // Start a transaction
        const tx = session.beginTransaction();

        // Fetch movie details from TMDB and create movie nodes if they do not exist
        const movieDetailsPromises = movies.map(async (movieTitle) => {
            const movieDetails = await TmdbService.fetchMovieDetails(movieTitle);
            if (!movieDetails) {
                throw new Error(`Movie not found: ${movieTitle}`);
            }
            await tx.run(
                `MERGE (m:Movie {movieId: $id})
                 ON CREATE SET m.title = $title, m.releaseDate = $releaseDate, m.overview = $overview, m.posterPath = $posterPath
                 RETURN m`,
                {
                    id: movieDetails.id,
                    title: movieDetails.title,
                    releaseDate: movieDetails.release_date,
                    overview: movieDetails.overview,
                    posterPath: movieDetails.poster_path
                }
            );
            return movieDetails.id;
        });

        const movieIds = await Promise.all(movieDetailsPromises);

        const result = await tx.run(
            `CREATE (w:Watchlist {id: $watchlistId, name: $name, tags: $tags, visibility: $visibility, ranked: $ranked, description: $description,img : $img, collaborative: $collaborative})
             MERGE (u:User {uid: $userId})
             CREATE (u)-[:HAS_WATCHLIST]->(w)
             RETURN w`,
            { watchlistId, name, tags, visibility, ranked, description, collaborative, img, userId }
        );

        console.log("Watchlist created and associated with the user.");
        if (result.records.length === 0) {
            throw new Error("Failed to create watchlist.");
        }

        // Associate movies with the watchlist
        for (const movieId of movieIds) {
            await tx.run(
                `MATCH (w:Watchlist {id: $watchlistId}), (m:Movie {movieId: $movieId})
                 MERGE (w)-[:INCLUDES]->(m)`,
                { watchlistId, movieId }
            );
        }

        // If collaborative, associate collaborator users with the watchlist
        if (collaborative) {
            for (const colabUserId of collabUserIds) {
                await tx.run(
                    `MERGE (u:User {uid: $colabUserId})
                     CREATE (u)-[:HAS_WATCHLIST]->(w)`,
                    { watchlistId, colabUserId }
                );
            }
        }

        // Commit the transaction
        await tx.commit();

        console.log("Movies and collaborators associated with the watchlist.");

        return { id: watchlistId, ...watchlistData };
    } catch (error) {
        console.error("Error creating watchlist:", error);
        if (tx) await tx.rollback();
        throw error;
    } finally {
        await session.close();
    }
};


exports.modifyWatchlist = async (watchlistId, updatedData) => {
    const session = driver.session();

    const updateFields = [];
    const updateValues = { watchlistId };

    // Dynamically create the Cypher SET clause based on provided fields
    Object.keys(updatedData).forEach(key => {
        updateFields.push(`w.${key} = $${key}`);
        updateValues[key] = updatedData[key];
    });

    const setClause = updateFields.join(', ');

    try {
        const result = await session.run(
            `MATCH (w:Watchlist {id: $watchlistId})
             SET ${setClause}
             RETURN w`,
            updateValues
        );

        if (result.records.length === 0) {
            throw new Error('Watchlist not found');
        }
        console.log("Watchlist has been updated successfully");
        const watchlist = result.records[0].get('w').properties;
        return watchlist;
    } catch (error) {
        console.error('Error modifying watchlist:', error);
        throw error;
    } finally {
        await session.close();
    }
};


// Get a particular watchlist's details
exports.getWatchlistDetails = async (watchlistId) => {
    const session = driver.session();

    try {
        const result = await session.run(
            `MATCH (w:Watchlist {id: $watchlistId})-[:INCLUDES]->(m:Movie)
             RETURN w, m.movieId AS movieId`,
            { watchlistId }
        );

        if (result.records.length === 0) {
            throw new Error('Watchlist not found');
        }

        const watchlistRecord = result.records[0].get('w').properties;
        const movieIds = result.records.map(record => record.get('movieId'));

        const movieDetailsPromises = movieIds.map(id => TmdbService.getMovieDetails(id));
        const movies = await Promise.all(movieDetailsPromises);

        const movieList = movies.map(movie => ({
            id: movie.id,
            title: movie.title,
            genre: movie.genres.map(genre => genre.name).join(', '),
            duration: movie.runtime,
            poster_path: movie.poster_path
        }));

        console.log('About to return request');

        return {
            name: watchlistRecord.name,
            movieList
        };
    } catch (error) {
        console.error('Error fetching watchlist details:', error);
        throw error;
    } finally {
        await session.close();
    }
};

exports.getCollaborators = async (watchlistId) => {
    const session = driver.session();

    try {
        console.log("Fetching collaborators for watchlist:", watchlistId);

        // Run a query to find all users with a HAS_WATCHLIST relationship to the watchlist
        const result = await session.run(
            `MATCH (w:Watchlist {id: $watchlistId})<-[:HAS_WATCHLIST]-(u:User)
             RETURN u.uid AS userId, u.name AS name, u.username AS username, u.avatar AS avatar`,
            { watchlistId }
        );

        if (result.records.length === 0) {
            console.log("No collaborators found for this watchlist.");
            return [];
        }

        // Process the result to return an array of collaborators
        const collaborators = result.records.map(record => ({
            userId: record.get('userId'),
            name: record.get('name'),
            username: record.get('username'),
            avatar: record.get('avatar')
        }));

        console.log("Collaborators fetched successfully.");

        return collaborators;
    } catch (error) {
        console.error("Error fetching collaborators:", error);
        throw error;
    } finally {
        await session.close();
    }
};

exports.getFollowedUsersWatchlists = async (userId) => {
    const session = driver.session();

    try {
        const vis = true;
        const result = await session.run(
            `MATCH (u:User {uid: $userId})-[:FOLLOWS]->(followee:User)-[:HAS_WATCHLIST]->(w:Watchlist{visibility : $vis})
             RETURN w.id AS watchlistId, w.name AS name, w.description AS description, w.ranked AS ranked, 
                    w.collaborative AS collaborative, w.tags AS tags, w.img AS img`,
            { userId, vis }
        );

        if (result.records.length === 0) {
            return [];
        }

        const watchlists = result.records.map(record => ({
            watchlistId: record.get('watchlistId'),
            name: record.get('name'),
            description: record.get('description'),
            ranked: record.get('ranked'),
            collaborative: record.get('collaborative'),
            tags: record.get('tags'),
            img: record.get('img'),
        }));

        console.log("Watchlists fetched successfully for followed users.");
        return watchlists;
    } catch (error) {
        console.error("Error fetching watchlists of followed users:", error);
        throw error;
    } finally {
        await session.close();
    }
};



exports.deleteWatchlist = async (watchlistId) => {
    const session = driver.session();

    try {
        await session.run(
            `MATCH (w:Watchlist {id: $watchlistId})
             DETACH DELETE w`,
            { watchlistId }
        );

        console.log('Watchlist deleted successfully');
    } finally {
        await session.close();
    }
};

