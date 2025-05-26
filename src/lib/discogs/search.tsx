import { NextResponse } from 'next/server';
var Discogs = require('disconnect').Client;

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x400?text=No+Image';

const db = new Discogs({
    userAgent: 'RecProject/1.0 +http://localhost:3000',
    consumerKey: process.env.CONSUMER_KEY,
    consumerSecret: process.env.CONSUMER_SECRET,
}).database();

export async function searchDiscogs(){

}