import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';

export default function MovieCard({imageUrl}) {
    return (
        <View style={styles.container}>
           
            <Image source={imageUrl} style={styles.image} />
        
        </View>
    );
}

const styles = StyleSheet.create({

    container:{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: 105,
        height: 105,
        paddingRight: 15,
        paddingLeft: 15,
        backgroundColor: "#fff",
        borderRadius: 50,

    },
      image: {
        paddingTop:10,
        width: '100%',
        height: '73%',
        borderRadius: 80,
        borderColor: '#000000',
    },

});