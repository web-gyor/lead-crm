const checkDiskSpace = require('check-disk-space').default;
const os = require('os');

/**
 * Combined Storage Utility
 * Checks disk space and returns safety status.
 */
exports.checkVpsStorage = async () => {
    try {
        // Handle Windows vs Linux paths
        const rootPath = os.platform() === 'win32' ? 'C:/' : '/';
        const diskSpace = await checkDiskSpace(rootPath);

        const freePercentage = (diskSpace.free / diskSpace.size) * 100;
        const freeGB = (diskSpace.free / (1024 ** 3)).toFixed(2);

        // Safety Logic
        const isSafe = freePercentage > 10.0;

        if (!isSafe) {
            console.warn(`⚠️ STORAGE ALERT: Only ${freePercentage.toFixed(2)}% (${freeGB}GB) space left!`);
        }

        return {
            isSafe,
            freePercentage: freePercentage.toFixed(2),
            freeGB,
            totalGB: (diskSpace.size / (1024 ** 3)).toFixed(2)
        };
    } catch (err) {
        console.error("Storage Check Error:", err.message);
        return { isSafe: false, error: err.message };
    }
};