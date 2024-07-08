// src/services/LikesApiService.js

export const toggleLikeReview = async (bodyData) => {
    const response = await fetch(`http://localhost:3000/like/toggleLikeReview`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
    });
    if (!response.ok) {
        throw new Error('Failed to update like review');
    }
    const data = await response.json();
    return data;
};

export const toggleLikeComment = async (bodyData) => {
    const response = await fetch(`http://localhost:3000/like/toggleLikeComment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
    });
    if (!response.ok) {
        throw new Error('Failed to update like comment');
    }
    const data = await response.json();
    return data;
};

export const toggleLikeMovie = async (bodyData) => {
    const response = await fetch(`http://localhost:3000/like/toggleLikeMovie`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
    });
    if (!response.ok) {
        throw new Error('Failed to update like movie');
    }
    const data = await response.json();
    return data;
};

export const toggleLikePost = async (bodyData) => {
    const response = await fetch(`http://localhost:3000/like/toggleLikePost`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
    });
    if (!response.ok) {
        throw new Error('Failed to update like post');
    }
    const data = await response.json();
    return data;
};