import prisma from "../prisma.js";
import {saveError} from "../../error/saveError.js";

export async function addNotificationEntityTypes() {
    try {
        const notificationEntityTypesAndId = [
            {entityTypeId: 1, entityType: "User"},
            {entityTypeId: 2, entityType: "Message"},
        ];
        await prisma.notificationEntityType.createMany({
            data: notificationEntityTypesAndId,
            skipDuplicates: true,
        });
    } catch (error) {
        saveError(error);
    }
}