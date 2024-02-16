import * as core from '@actions/core';
import * as github from '@actions/github';
import { Context } from '@actions/github/lib/context.js';
import * as _ from 'lodash';

type GithubClient = ReturnType<typeof github.getOctokit>;

function stripTime(date: Date) {
    return new Date(date.toDateString());
}

function getMilestoneNumber(client: GithubClient, milestoneTitle: string, useRegex: boolean) {
    return client.rest.issues.listMilestones({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
    })
    .then((response) => {
        const regExp = _.escapeRegExp(milestoneTitle);
        const today = stripTime(new Date());
        const milestone = response.data
        .filter((milestone) => !milestone.due_on || stripTime(new Date(milestone.due_on)) >= today)
        .find((milestone) => useRegex ? new RegExp(regExp).test(milestone.title) : milestone.title === milestoneTitle);
        
        const milestoneNumber = milestone?.number;

        if (!milestoneNumber) throw new Error(`Milestone "${milestoneTitle}" not found`);
        
        return milestoneNumber;
    })
    .catch((error) => {
        core.setFailed(error.message);
    });
}

async function updateIssue(client: GithubClient, issueNumber: number, milestoneNumber: number) {
    return client.rest.issues.update({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: issueNumber,
        milestone: milestoneNumber,
    })
    .catch((error) => {
        core.setFailed(error.message);
    });
}

async function updatePR(client: GithubClient, prNumber: number, milestoneNumber: number) {
    return client.rest.pulls.update({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: prNumber,
        milestone: milestoneNumber,
    })
    .catch((error) => {
        core.setFailed(error.message);
    });
}

try {
    const context: Context = github.context;

    if (context.eventName !== 'pull_request' && context.eventName !== 'issues') {
        throw new Error('This action is only supported for pull_request or issues events');
    }

    const event = context.payload;

    if (!event.pull_request?.number) throw new Error('Could not get PR number from Payload')
    if (!event.issue?.number) throw new Error('Could not get Issue number from Payload')

    const token = core.getInput('github-token', { required: true });
    const milestoneTitle = core.getInput('milestone-title', { required: true });
    const useRegex = Boolean(core.getInput('use-regex', { required: false }));

    const client = github.getOctokit(token);

    const milestoneNumber = await getMilestoneNumber(client, milestoneTitle, useRegex) as number;
    const issueNumber = event.issue.number;
    const prNumber = event.pull_request.number;

    if (context.eventName === 'pull_request') await updatePR(client, prNumber, milestoneNumber);
    else await updateIssue(client, issueNumber, milestoneNumber);
} catch (error: unknown) {
    core.setFailed(`${error}`);
}