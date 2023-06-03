import inquirer from "inquirer";
import {sourcesNames} from "../crawlers/sourcesArray.js";
import {comparePrevSummaryWithNewMethod} from "../crawlers/extractors/summary.js";
import {comparePrevPosterWithNewMethod} from "../crawlers/extractors/poster.js";
import {comparePrevTrailerWithNewMethod} from "../crawlers/extractors/trailer.js";
import {comparePrevDownloadLinksWithNewMethod} from "../crawlers/extractors/downloadLinks.js";

cli();
export default async function cli() {
    const questions = [
        {
            type: 'list',
            name: 'ans',
            message: `what to do?`,
            choices: ["Check Extractor Functions", "Soon"],
        },
    ];
    console.log();
    let answers = await inquirer.prompt(questions);
    if (answers.ans === 'Check Extractor Functions') {
        const q2 = [
            {
                type: 'list',
                name: 'ans',
                message: `check what?`,
                choices: ["All", "DownloadLinks", "Poster", "Trailer", "Summary"],
            },
        ];
        const q3 = [
            {
                type: 'list',
                name: 'ans',
                message: `which source?`,
                choices: ["All", ...sourcesNames],
            },
        ];
        console.log();
        let ans2 = (await inquirer.prompt(q2)).ans;
        let ans3 = (await inquirer.prompt(q3)).ans;
        const sourceNames = ans3 === 'All' ? null : [ans3];
        if (ans2 === 'All') {
            await comparePrevSummaryWithNewMethod(sourceNames);
            await comparePrevPosterWithNewMethod(sourceNames);
            await comparePrevTrailerWithNewMethod(sourceNames);
            await comparePrevDownloadLinksWithNewMethod(sourceNames, "pageContent");
            await comparePrevDownloadLinksWithNewMethod(sourceNames, "checkRegex");
        } else if (ans2 === 'DownloadLinks') {
            await comparePrevDownloadLinksWithNewMethod(sourceNames, "pageContent");
            await comparePrevDownloadLinksWithNewMethod(sourceNames, "checkRegex");
        } else if (ans2 === 'Poster') {
            await comparePrevPosterWithNewMethod(sourceNames);
        } else if (ans2 === 'Trailer') {
            await comparePrevTrailerWithNewMethod(sourceNames);
        } else if (ans2 === 'Summary') {
            await comparePrevSummaryWithNewMethod(sourceNames);
        }
    }
}