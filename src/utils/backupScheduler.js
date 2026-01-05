const { Settings } = require('../models');
const autoBackup = require('./backup');
const logger = require('./logger');

let currentTimeout = null;
let isRunning = false;

function parseTime(hhmm) {
    const parts = (hhmm || '02:00').split(':');
    const hh = parseInt(parts[0], 10) || 2;
    const mm = parseInt(parts[1], 10) || 0;
    return { hh, mm };
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function addMonths(date, months) {
    const d = new Date(date);
    const targetMonth = d.getMonth() + months;
    d.setMonth(targetMonth);
    // if overflowed (e.g., Feb 30), setDate to last day of previous month
    if (d.getMonth() !== ((targetMonth) % 12 + 12) % 12) {
        d.setDate(0);
    }
    return d;
}

function computeNextRun(now, frequency, timeStr) {
    const { hh, mm } = parseTime(timeStr);
    const candidate = new Date(now);
    candidate.setHours(hh, mm, 0, 0);

    if (frequency === 'daily') {
        if (candidate <= now) {
            return addDays(candidate, 1);
        }
        return candidate;
    }

    if (frequency === 'weekly') {
        // weekly: next occurrence at same weekday/time; if today's time passed, schedule 7 days later
        if (candidate <= now) return addDays(candidate, 7);
        return candidate;
    }

    if (frequency === 'monthly') {
        // monthly: same day of month at time; if passed, next month
        const next = new Date(candidate);
        if (next <= now) {
            return addMonths(next, 1);
        }
        return next;
    }

    // default fallback: daily
    if (candidate <= now) return addDays(candidate, 1);
    return candidate;
}

async function scheduleFromSettings(settings) {
    try {
        if (currentTimeout) {
            clearTimeout(currentTimeout);
            currentTimeout = null;
        }

        if (!settings || !settings.backup) {
            logger.info('No backup settings found; auto-backup disabled');
            return;
        }

        const cfg = settings.backup || {};
        const enabled = !!cfg.auto_backup_enabled;
        const frequency = cfg.backup_frequency || 'daily';
        const timeStr = cfg.backup_time || '02:00';
        const retention = Number(cfg.retention_days || cfg.retention_days === 0 ? cfg.retention_days : 30);
        const location = cfg.backup_location || null;

        if (!enabled) {
            return;
        }

        // Backup location is required - no default fallback
        if (!location) {
            logger.warn('Auto backup is enabled but no backup location is configured. Skipping.');
            return;
        }

        // Set environment overrides for retention
        if (!Number.isNaN(retention)) process.env.BACKUP_RETENTION_DAYS = String(retention);

        const now = new Date();
        const next = computeNextRun(now, frequency, timeStr);
        const delay = Math.max(1000, next.getTime() - now.getTime());

        logger.info(`Scheduling next automatic backup at ${next.toISOString()} (in ${(delay / 1000 / 60).toFixed(1)} minutes). Frequency: ${frequency}`);

        currentTimeout = setTimeout(async () => {
            if (isRunning) {
                logger.warn('Previous backup still running; skipping this scheduled run');
            } else {
                isRunning = true;
                try {
                    // Set retention env override
                    if (!Number.isNaN(retention)) process.env.BACKUP_RETENTION_DAYS = String(retention);

                    // Pass location directly to autoBackup
                    await Promise.resolve(autoBackup(location));

                    // Update settings.last_backup timestamp
                    try {
                        const s = await Settings.findOne();
                        if (s) {
                            s.backup = s.backup || {};
                            s.backup.last_backup = new Date();
                            await s.save();
                        }
                    } catch (err) {
                        logger.warn('Failed to update last_backup in settings', { error: err.message || err });
                    }
                } catch (err) {
                    logger.error('Scheduled backup failed:', err);
                } finally {
                    isRunning = false;
                    // Reschedule next run based on same settings
                    scheduleFromSettings(settings).catch(e => logger.error('Reschedule failed:', e));
                }
            }
        }, delay);

    } catch (error) {
        logger.error('Error scheduling backup from settings:', error);
    }
}

async function startScheduler() {
    try {
        const settings = await Settings.findOne();
        if (!settings) {
            logger.info('No settings document found; creating default settings');
            const s = new Settings({});
            await s.save();
            return scheduleFromSettings(s);
        }
        return scheduleFromSettings(settings);
    } catch (error) {
        logger.error('Failed to start backup scheduler:', error);
    }
}

async function refreshSchedule() {
    try {
        const settings = await Settings.findOne();
        return scheduleFromSettings(settings);
    } catch (error) {
        logger.error('Failed to refresh backup schedule:', error);
    }
}

module.exports = {
    startScheduler,
    refreshSchedule
};
