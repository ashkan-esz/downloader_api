const {dataLevelConfig} = require("../models/movie");

export function getAggregationProjectionWithSkipLimits(level, skip, limit) {
    if (level === 'high') {
        return [
            {
                $skip: skip,
            },
            {
                $limit: limit,
            }
        ];
    } else {
        return [
            {
                $project: dataLevelConfig[level],
            },
            {
                $skip: skip,
            },
            {
                $limit: limit,
            }
        ];
    }
}
