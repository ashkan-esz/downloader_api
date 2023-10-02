import getCollection from "../mongoDB.js";
import prisma from "../prisma.js";
import {saveError} from "../../error/saveError.js";


export async function getAllS3PostersDB() {
    try {
        let collection = await getCollection('movies');
        return await collection.find({poster_s3: {$ne: null}}, {projection: {'poster_s3.url': 1}}).toArray();
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function getAllS3WidePostersDB() {
    try {
        let collection = await getCollection('movies');
        return await collection.find({poster_wide_s3: {$ne: null}}, {projection: {'poster_wide_s3.url': 1}}).toArray();
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function getAllS3TrailersDB() {
    try {
        let collection = await getCollection('movies');
        return await collection.find({trailer_s3: {$ne: null}}, {projection: {'trailer_s3.url': 1}}).toArray();
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function getAllS3CastImageDB() {
    try {
        return await prisma.castImage.findMany({
            where: {},
            select: {
                url: true,
            }
        });
    } catch (error) {
        saveError(error);
        return null;
    }
}
