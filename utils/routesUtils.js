const {dataConfig} = require("../routes/configs");

export function getAggregationProjectionWithSkipLimits(dataLevel, skip, limit) {
    if (dataLevel === 'high') {
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
                $project: dataConfig[dataLevel],
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
