import prisma from "../../prisma.js";
import {saveError} from "../../../error/saveError.js";

export const PermissionsList = Object.freeze({
    torrent_search: "torrent_search",
    torrent_leach: "torrent_leach",
    crawl_source: "crawl_source",
    //-----------------------------
    admin_create_role: "admin_create_role",
    admin_edit_role: "admin_edit_role",
    admin_delete_role: "admin_delete_role",
    //-----------------------------
    admin_create_admin: "admin_create_admin",
    admin_remove_admin: "admin_remove_admin",
    //-----------------------------
    admin_get_users: "admin_get_users",
    admin_get_permissions: "admin_get_permissions",
    //-----------------------------
    admin_crawler_status: "admin_crawler_status",
    admin_start_crawler: "admin_start_crawler",
    admin_start_torrent_search: "admin_start_torrent_search",
    admin_control_crawler: "admin_control_crawler",
    //-----------------------------
    admin_get_crawler_sources: "admin_get_crawler_sources",
    admin_edit_crawler_sources: "admin_edit_crawler_sources",
    //-----------------------------
    admin_get_duplicate_titles: "admin_get_duplicate_titles",
    //-----------------------------
    admin_get_crawler_logs: "admin_get_crawler_logs",
    admin_edit_crawler_logs: "admin_edit_crawler_logs",
    //-----------------------------
    admin_get_db_configs: "admin_get_db_configs",
    admin_edit_db_configs: "admin_edit_db_configs",
    //-----------------------------
    admin_get_server_status: "admin_get_server_status",
    admin_check_remote_browser: "admin_check_remote_browser",
    //-----------------------------
    admin_manage_app_versions: "admin_manage_app_versions",
    //-----------------------------
    admin_check_3rd_party_apis: "admin_check_3rd_party_apis",
    //-----------------------------
    admin_get_bots: "admin_get_bots",
    admin_edit_bots: "admin_edit_bots",
    //-----------------------------
    admin_get_cronjobs: "admin_get_cronjobs",
    admin_run_cronjobs: "admin_run_cronjobs",
    //-----------------------------
    admin_manage_related_titles: "admin_manage_related_titles",
    //-----------------------------
    admin_remove_doc: "admin_remove_doc",
    //-----------------------------
});

export const Default_Role_Ids = Object.freeze({
    mainAdmin: 0,
    defaultAdmin: 1,
    defaultUser: 2,
    testUser: 3,
    defaultBot: 4,
});

export async function addPermissionsToPostgres() {
    try {
        let rr = Object.keys(PermissionsList).map((item, index) => ({
            id: index,
            name: item,
            description: "",
        }));

        await prisma.permission.createMany({
            data: rr,
            skipDuplicates: true,
        });
        return 'ok';
    } catch (error) {
        saveError(error);
        return 'error';
    }
}

export async function addMainAdminRoleToPostgres() {
    try {
        let res = await prisma.role.create({
            data: {
                id: Default_Role_Ids.mainAdmin,
                name: "main_admin_role",
                description: "",
                torrentLeachLimitGb: 0,
                torrentSearchLimit: 0,
                permissions: {
                    createMany: {
                        data: Object.keys(PermissionsList).map((ite, index) => ({
                            permissionId: index,
                        })),
                        skipDuplicates: true,
                    }
                }
            }
        });

        return 'ok';
    } catch (error) {
        if (error.code === "P2002") {
            return 'ok';
        }
        saveError(error);
        return 'error';
    }
}

export async function addDefaultAdminRoleToPostgres() {
    try {
        let res = await prisma.role.create({
            data: {
                id: Default_Role_Ids.defaultAdmin,
                name: "default_admin_role",
                description: "",
                torrentLeachLimitGb: 0,
                torrentSearchLimit: 0,
                permissions: {
                    createMany: {
                        data: [
                            {permissionId: Object.keys(PermissionsList).indexOf(PermissionsList.admin_get_users)},
                            {permissionId: Object.keys(PermissionsList).indexOf(PermissionsList.admin_get_permissions)},
                            {permissionId: Object.keys(PermissionsList).indexOf(PermissionsList.admin_crawler_status)},
                            {permissionId: Object.keys(PermissionsList).indexOf(PermissionsList.admin_get_cronjobs)},
                            {permissionId: Object.keys(PermissionsList).indexOf(PermissionsList.admin_get_server_status)},
                        ],
                        skipDuplicates: true,
                    }
                }
            }
        });

        return 'ok';
    } catch (error) {
        if (error.code === "P2002") {
            return 'ok';
        }
        saveError(error);
        return 'error';
    }
}

export async function addDefaultUserRoleToPostgres() {
    try {
        let res = await prisma.role.create({
            data: {
                id: Default_Role_Ids.defaultUser,
                name: "default_user_role",
                description: "",
                torrentLeachLimitGb: 1,
                torrentSearchLimit: 1,
            }
        });

        return 'ok';
    } catch (error) {
        if (error.code === "P2002") {
            return 'ok';
        }
        saveError(error);
        return 'error';
    }
}

export async function addTestUserRoleToPostgres() {
    try {
        let res = await prisma.role.create({
            data: {
                id: Default_Role_Ids.testUser,
                name: "test_user_role",
                description: "",
                torrentLeachLimitGb: 1,
                torrentSearchLimit: 1,
            }
        });

        return 'ok';
    } catch (error) {
        if (error.code === "P2002") {
            return 'ok';
        }
        saveError(error);
        return 'error';
    }
}

export async function addDefaultBotRoleToPostgres() {
    try {
        let res = await prisma.role.create({
            data: {
                id: Default_Role_Ids.defaultBot,
                name: "default_bot_role",
                description: "",
                torrentLeachLimitGb: 1,
                torrentSearchLimit: 1,
                permissions: {
                    createMany: {
                        data: [
                            {permissionId: Object.keys(PermissionsList).indexOf(PermissionsList.torrent_search)},
                            {permissionId: Object.keys(PermissionsList).indexOf(PermissionsList.torrent_leach)},
                        ],
                        skipDuplicates: true,
                    }
                }
            }
        });

        return 'ok';
    } catch (error) {
        if (error.code === "P2002") {
            return 'ok';
        }
        saveError(error);
        return 'error';
    }
}

//---------------------------------------------------
//---------------------------------------------------

export async function getUserPermissionsByRoleIds(roleIds) {
    try {
        const res = await prisma.roleToPermission.findMany({
            where: {
                roleId: {
                    in: roleIds,
                }
            },
            include: {
                permission: {
                    select: {
                        name: true,
                    }
                }
            }
        });

        return res.map(item => item.permission.name);
    } catch (error) {
        saveError(error);
        return null;
    }
}