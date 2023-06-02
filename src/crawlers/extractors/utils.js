import {saveError} from "../../error/saveError.js";

export function getFixedSummary(summary) {
    try {
        if (!summary) {
            return '';
        }
        return summary
            .replace(/<p>|<\/p>|<b>|<\/b>/g, '')
            .replace('[Written by MAL Rewrite]', '')
            .replace('N/A', '')
            .replace(/([.…])+$/, '')
            .trim();
    } catch (error) {
        saveError(error);
        return '';
    }
}

export function getFixedGenres(genres) {
    try {
        if (!genres) {
            return [];
        }
        return genres.toLowerCase().split(',')
            .map(item => item.toLowerCase().trim().replace(/\s+/g, '-').replace('sports', 'sport'))
            .filter(item => item !== 'n/a' && item !== 'anime');
    } catch (error) {
        saveError(error);
        return [];
    }
}