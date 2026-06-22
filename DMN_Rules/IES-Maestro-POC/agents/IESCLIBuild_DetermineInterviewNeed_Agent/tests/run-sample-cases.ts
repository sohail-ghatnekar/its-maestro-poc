import fs from "node:fs";
import path from "node:path";

import { mockDetermineInterviewNeedScenarios } from "../src/data/mockDetermineInterviewNeedInputs";
import { determineInterviewNeed } from "../src/index";

function findProjectRoot(startDir: string): string {
  let currentDir = startDir;

  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, "package.json"))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return path.resolve(__dirname, "..");
}

const projectRoot = findProjectRoot(__dirname);
const resultsDir = path.join(projectRoot, "tests", "results");
fs.mkdirSync(resultsDir, { recursive: true });

const failures: string[] = [];

function assertCondition(condition: boolean, message: string): void {
  if (!condition) {
    failures.push(message);
  }
}

for (const scenario of mockDetermineInterviewNeedScenarios) {
  const output = determineInterviewNeed(scenario.inputs);
  const reasonCodes = output.agentReview.reasons.map((reason) => reason.reasonCode);
  const actionText = output.agentReview.recommendedWorkerActions.join(" ");

  fs.writeFileSync(
    path.join(resultsDir, `${scenario.scenarioId}.json`),
    JSON.stringify(output, null, 2),
  );

  console.log(JSON.stringify({ scenarioId: scenario.scenarioId, output }));

  if (scenario.expected.shouldCreateHumanTask !== undefined) {
    assertCondition(
      output.agentReview.shouldCreateHumanTask ===
        scenario.expected.shouldCreateHumanTask,
      `${scenario.scenarioId}: expected shouldCreateHumanTask ${scenario.expected.shouldCreateHumanTask}`,
    );
  }

  if (scenario.expected.recommendedPriority) {
    assertCondition(
      output.agentReview.recommendedPriority ===
        scenario.expected.recommendedPriority,
      `${scenario.scenarioId}: expected priority ${scenario.expected.recommendedPriority}`,
    );
  }

  for (const expectedReason of scenario.expected.reasonCodes || []) {
    assertCondition(
      reasonCodes.includes(expectedReason),
      `${scenario.scenarioId}: expected reason ${expectedReason}`,
    );
  }

  if (scenario.expected.nextRecommendedStepIncludes) {
    assertCondition(
      output.statusUpdate.nextRecommendedStep.includes(
        scenario.expected.nextRecommendedStepIncludes,
      ),
      `${scenario.scenarioId}: expected next step to include ${scenario.expected.nextRecommendedStepIncludes}`,
    );
  }

  if (scenario.expected.workerActionIncludes) {
    assertCondition(
      actionText.includes(scenario.expected.workerActionIncludes),
      `${scenario.scenarioId}: expected worker action to include ${scenario.expected.workerActionIncludes}`,
    );
  }

  if (
    scenario.expected.reasonCodes?.includes(
      "DOCUMENT_REVIEW_PAYSTUB_LOW_CONFIDENCE",
    )
  ) {
    assertCondition(
      output.humanTaskRecommendation !== null,
      `${scenario.scenarioId}: expected humanTaskRecommendation to exist`,
    );
    assertCondition(
      output.agentReview.missingInfoItems.some((item) =>
        item.label.toLowerCase().includes("paystub"),
      ),
      `${scenario.scenarioId}: expected paystub follow-up missing info item`,
    );
  }

  assertCondition(
    !/case is eligible|case is ineligible|benefits should be approved|benefits should be denied/i.test(
      JSON.stringify(output),
    ),
    `${scenario.scenarioId}: output contains prohibited eligibility language`,
  );
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}

console.error(`Sample checks passed for ${mockDetermineInterviewNeedScenarios.length} scenarios.`);
