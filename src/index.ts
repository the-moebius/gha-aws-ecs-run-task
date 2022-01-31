
import * as core from '@actions/core';
import AWS from 'aws-sdk';
import process from 'process';

import {
  startTask,
  StartTaskOptions,
  TaskStatus,
  TaskStatusUpdate,

} from '@moebius/aws-ecs-task-runner';


(async () => {

  try {
    await main();

  } catch (error: any) {
    core.setFailed(error);
  }

})();

async function main() {

  core.info(`Starting the task`);

  const vpcConfig: AWS.ECS.AwsVpcConfiguration = {
    subnets: [],
  };

  const networkConfig: AWS.ECS.NetworkConfiguration = {
    awsvpcConfiguration: vpcConfig,
  };

  const overrides: AWS.ECS.ContainerOverrides = [];

  const runTaskRequest: AWS.ECS.RunTaskRequest = {
    taskDefinition: '',
    networkConfiguration: networkConfig,
    overrides: {
      containerOverrides: overrides,
    },
  };

  const options: StartTaskOptions = {
    request: runTaskRequest,
  };


  //========//
  // REGION //
  //========//

  const region = core.getInput('region');
  if (region) {
    options.region = region;
  }


  //=============//
  // LAUNCH TYPE //
  //=============//

  const launchType = core.getInput('launchType');
  if (launchType) {
    options.request.launchType = launchType;
  }


  //=========//
  // CLUSTER //
  //=========//

  const cluster = core.getInput('cluster');
  if (cluster) {
    options.request.cluster = cluster;
  }


  //=================//
  // TASK DEFINITION //
  //=================//

  const taskDefinition = core.getInput('taskDefinition', {
    required: true,
  });
  if (taskDefinition) {
    options.request.taskDefinition = taskDefinition;
  }


  //=========//
  // SUBNETS //
  //=========//

  const subnets = core.getInput('subnets');
  if (subnets) {
    vpcConfig.subnets = subnets
      .split(',')
      .map(subnetId => subnetId.trim())
    ;
  }


  //=================//
  // SECURITY GROUPS //
  //=================//

  const securityGroups = core.getInput('securityGroups');
  if (securityGroups) {
    vpcConfig.securityGroups = securityGroups
      .split(',')
      .map(sgId => sgId.trim())
    ;
  }


  //=====================//
  // CONTAINER OVERRIDES //
  //=====================//

  const containerName = core.getInput('containerName');
  const command = core.getInput('command');
  if (command && !containerName) {
    throw new Error(
      `Container name must be specified when ` +
      `command option is used`
    );
  }
  if (containerName && command) {
    overrides.push({
      name: containerName,
      command: [command],
    });
  }

  const { taskId, monitor } = await startTask(options);

  core.info(`\nTask is created:\n${taskId}\n`);

  core.info(`Starting task monitoring`);

  const { exitCode } = await monitor({
    onStatusChange,
  });

  core.info(`Task finished`);

  core.info(
    `Container exited with code: ${exitCode}`
  );

  process.exit(exitCode);


  function onStatusChange(update: TaskStatusUpdate) {

    switch (update.status) {
      case TaskStatus.Provisioning:
        core.info(`The task is being provisioned…`);
        break;
      case TaskStatus.Pending:
        core.info(`The task is pending…`);
        break;
      case TaskStatus.Running:
        core.info(`The task is now running…`);
        break;
      case TaskStatus.Deprovisioning:
        core.info(`The task is being deprovisioned…`);
        break;
      case TaskStatus.Stopped:
        core.info(`The task is now stopped…`);
        break;
    }

  }

}
