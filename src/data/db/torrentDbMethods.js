import prisma from "../prisma.js";
import {saveError} from "../../error/saveError.js";

export async function getUserTorrent(userId) {
    try {
        return await prisma.userTorrent.findFirst({
            where: {
                userId: userId,
            }
        })
    } catch (error) {
        saveError(error);
        return null;
    }
}

export async function increaseUserTorrentSearch(userId) {
    try {
        return await prisma.userTorrent.update({
            where: {
                userId: userId,
            },
            data: {
                torrentSearch: {
                    increment: 1,
                }
            },
        })
    } catch (error) {
        saveError(error);
        return null;
    }
}

