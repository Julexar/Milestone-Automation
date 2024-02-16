import * as core from '@actions/core';
import * as github from '@actions/github';
import { minimatch } from 'minimatch';

function stripTime(date) {
    return new Date(date.toDateString());
}

function getMilestoneNumber(client, milestoneTitle, useRegex) {
    return client.rest.issues.listMilestones({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
    })
    .then((response) => {
        const today = stripTime(new Date());
        const milestone = response.data
        .filter((milestone) => !milestone.due_on || stripTime(new Date(milestone.due_on)) >= today)
        .find((milestone) => useRegex ? minimatch(milestone.title, milestoneTitle, { nocase: true, debug: core.isDebug() }) : milestone.title === milestoneTitle);
        
        const milestoneNumber = milestone?.number;

        if (!milestoneNumber) throw new Error(`Milestone "${milestoneTitle}" not found`);
        
        return milestoneNumber;
    })
    .catch((error) => {
        core.setFailed(error.message);
    });
}

async function updateWithMilestone(client, number, milestoneNumber) {
    return client.rest.issues.update({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: number,
        milestone: milestoneNumber,
    })
    .catch((error) => {
        core.setFailed(error.message);
    });
}

try {
    const context = github.context;
    const event = context.payload;

    const token = core.getInput('token', { required: true });
    const milestoneTitle = core.getInput('milestone', { required: true });
    const useGlob = Boolean(core.getInput('use-glob', { required: false }));

    const client = github.getOctokit(token);
    const milestoneNumber = Number(await getMilestoneNumber(client, milestoneTitle, useGlob));

    if (context.eventName === 'pull_request' && !event.pull_request?.number) throw new Error('Could not get PR number from Payload');
    else if (context.eventName === 'issues' && !event.issue?.number) throw new Error('Could not get Issue number from Payload');

    await updateWithMilestone(client, event.pull_request?.number || event.issue?.number, milestoneNumber);
} catch (error) {
    core.setFailed(error.message);
}