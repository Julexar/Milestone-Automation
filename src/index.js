import * as core from '@actions/core';
import * as github from '@actions/github';
import * as _ from 'lodash';

function stripTime(date) {
    return new Date(date.toDateString());
}


function getMilestoneNumber(client, milestoneTitle, useRegex) {
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

async function updateIssue(client, issueNumber, milestoneNumber) {
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

async function updatePR(client, prNumber, milestoneNumber) {
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
    const context = github.context;

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

    const milestoneNumber = await getMilestoneNumber(client, milestoneTitle, useRegex);
    const issueNumber = event.issue.number;
    const prNumber = event.pull_request.number;

    if (context.eventName === 'pull_request') await updatePR(client, prNumber, milestoneNumber);
    else await updateIssue(client, issueNumber, milestoneNumber);
} catch (error) {
    core.setFailed(error.message);
}