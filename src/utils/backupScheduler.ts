/**
 * Backup Scheduler
 *
 * Reads backup configuration from Settings and schedules
 * automatic backups at the configured frequency and time.
 */

import { SettingsModel } from "../models/Settings.model";
import autoBackup from "./backup";
import logger from "./logger";
import type { Document } from "mongoose";

let currentTimeout: ReturnType<typeof setTimeout> | null = null;
let isRunning = false;

function parseTime(hhmm: string): { hh: number; mm: number } {
    const parts = (hhmm || "02:00").split(":");
    const hh = parseInt(parts[0], 10) || 2;
    const mm = parseInt(parts[1], 10) || 0;
    return { hh, mm };
}

function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    const targetMonth = d.getMonth() + months;
    d.setMonth(targetMonth);
    // if overflowed (e.g., Feb 30), set to last day of previous month
    if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) {
        d.setDate(0);
    }
    return d;
}

function computeNextRun(now: Date, frequency: string, timeStr: string): Date {
    const { hh, mm } = parseTime(timeStr);
    const candidate = new Date(now);
    candidate.setHours(hh, mm, 0, 0);

    if (frequency === "daily") {
        if (candidate <= now) return addDays(candidate, 1);
        return candidate;
    }

    if (frequency === "weekly") {
        if (candidate <= now) return addDays(candidate, 7);
        return candidate;
    }

    if (frequency === "monthly") {
        const next = new Date(candidate);
        if (next <= now) return addMonths(next, 1);
        return next;
    }

    // default fallback: daily
    if (candidate <= now) return addDays(candidate, 1);
    return candidate;
}

interface SettingsBackupConfig {
    auto_backup_enabled?: boolean;
    backup_frequency?: string;
    backup_time?: string;
    retention_days?: number;
    backup_location?: string;
    last_backup?: Date;
    backup_destination?: "local" | "google_drive" | "both";
    google_drive_connected?: boolean;
    google_drive_email?: string;
    google_drive_folder_name?: string;
    google_drive_last_backup?: Date;
    google_drive_auto_upload?: boolean;
}

interface SettingsDoc extends Document {
    backup?: SettingsBackupConfig;
}

async function scheduleFromSettings(settings: SettingsDoc | null): Promise<void> {
    try {
        if (currentTimeout) {
            clearTimeout(currentTimeout);
            currentTimeout = null;
        }

        if (!settings || !settings.backup) {
            logger.info("Auto-backup disabled", { service: "backup", reason: "no_settings" });
            return;
        }

        const cfg = settings.backup;
        const enabled = !!cfg.auto_backup_enabled;
        const frequency = cfg.backup_frequency || "daily";
        const timeStr = cfg.backup_time || "02:00";
        const retention = Number(
            cfg.retention_days != null ? cfg.retention_days : 30
        );
        const location = cfg.backup_location || null;

        if (!enabled) return;

        // Backup location is required - no default fallback
        if (!location) {
            logger.warn("Auto backup skipped", {
                service: "backup",
                reason: "no_location_configured",
            });
            return;
        }

        // Set environment overrides for retention
        if (!Number.isNaN(retention))
            process.env.BACKUP_RETENTION_DAYS = String(retention);

        const now = new Date();
        const next = computeNextRun(now, frequency, timeStr);
        const delay = Math.max(1000, next.getTime() - now.getTime());

        logger.info("Scheduled next backup", {
            service: "backup",
            nextRun: next.toISOString(),
            minutesUntil: (delay / 1000 / 60).toFixed(1),
            frequency,
        });

        currentTimeout = setTimeout(async () => {
            if (isRunning) {
                logger.warn("Scheduled backup skipped", {
                    service: "backup",
                    reason: "previous_backup_running",
                });
            } else {
                isRunning = true;
                try {
                    if (!Number.isNaN(retention))
                        process.env.BACKUP_RETENTION_DAYS = String(retention);

                    const info = await Promise.resolve(autoBackup(location));

                    // Update settings.last_backup timestamp and upload to Google Drive if configured
                    try {
                        const s = await SettingsModel.findOne();
                        if (s) {
                            if (!s.backup) {
                                (s as unknown as Record<string, unknown>).backup = {};
                            }
                            const backupCfg = s.backup as SettingsBackupConfig;
                            backupCfg.last_backup = new Date();

                            const dest = backupCfg.backup_destination || "local";
                            const connected = !!backupCfg.google_drive_connected;
                            const autoUpload = !!backupCfg.google_drive_auto_upload;

                            if (connected && (dest === "google_drive" || dest === "both" || autoUpload)) {
                                logger.info("Uploading scheduled backup to Google Drive...", { service: "backup" });
                                try {
                                    const { GoogleDriveService } = require("./googleDriveService");
                                    const client = await GoogleDriveService.getOAuthClientWithTokens();
                                    const folderId = await GoogleDriveService.getOrCreateFolder(client, "MyApp Backups");
                                    await GoogleDriveService.uploadBackupFile(client, info.backupPath, folderId);
                                    
                                    backupCfg.google_drive_last_backup = new Date();
                                    
                                    // Delete local file if destination is cloud-only
                                    if (dest === "google_drive") {
                                        try {
                                            const fsMod = require("fs");
                                            fsMod.unlinkSync(info.backupPath);
                                            logger.info("Scheduled local backup file cleaned up (cloud-only destination)", { service: "backup" });
                                        } catch (unlinkErr) { /* ignore */ }
                                    }
                                    
                                    logger.info("Scheduled backup successfully uploaded to Google Drive", { service: "backup" });
                                } catch (uploadErr: any) {
                                    logger.error("Scheduled backup failed to upload to Google Drive:", { service: "backup", error: uploadErr.message });
                                }
                            }

                            await s.save();
                        }
                    } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : String(err);
                        logger.warn("Failed to update last_backup timestamp", {
                            service: "backup",
                            error: msg,
                        });
                    }
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err);
                    logger.error("Scheduled backup failed", { service: "backup", error: msg });
                } finally {
                    isRunning = false;
                    scheduleFromSettings(settings).catch((e) =>
                        logger.error("Reschedule failed", {
                            service: "backup",
                            error: e.message,
                        })
                    );
                }
            }
        }, delay);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error("Error scheduling backup", { service: "backup", error: msg });
    }
}

export async function startScheduler(): Promise<void> {
    try {
        const settings = await SettingsModel.findOne();
        if (!settings) {
            logger.info("Creating default settings", { service: "backup" });
            const s = new SettingsModel({});
            await s.save();
            return scheduleFromSettings(s as unknown as SettingsDoc);
        }
        return scheduleFromSettings(settings as unknown as SettingsDoc);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error("Failed to start backup scheduler", { service: "backup", error: msg });
    }
}

export async function refreshSchedule(): Promise<void> {
    try {
        const settings = await SettingsModel.findOne();
        return scheduleFromSettings(settings as unknown as SettingsDoc);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error("Failed to refresh backup schedule", { service: "backup", error: msg });
    }
}
