import { expect, test } from "@playwright/test";

function hasPath(
  url: string,
  expectedPath: string,
): boolean {
  return new URL(url).pathname === expectedPath;
}

test("direct TCP simulation is saved and replay does not create another run", async ({
  page,
}) => {
  let simulationPostCount = 0;

  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      hasPath(
        request.url(),
        "/api/v1/simulations",
      )
    ) {
      simulationPostCount += 1;
    }
  });

  await page.goto("/");

  await expect(
    page.getByText("API connected", {
      exact: true,
    }),
  ).toBeVisible();

  const runSimulationButton = page.getByRole(
    "button",
    {
      name: "Run simulation",
    },
  );

  await expect(runSimulationButton).toBeEnabled();

  const simulationResponsePromise =
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        hasPath(
          response.url(),
          "/api/v1/simulations",
        ) &&
        response.status() === 201,
    );

  await runSimulationButton.click();

  const simulationResponse =
    await simulationResponsePromise;

  const createdSimulation =
    (await simulationResponse.json()) as {
      id: number;
    };

  const runLabel = `Run #${createdSimulation.id}`;

  await expect(
    page
      .getByLabel("TCP handshake playback")
      .getByText(runLabel, {
        exact: true,
      }),
  ).toBeVisible();

  expect(simulationPostCount).toBe(1);

  const replayButton = page.getByRole(
    "button",
    {
      name: "Replay",
    },
  );

  await expect(replayButton).toBeEnabled();

  await replayButton.click();

  await page.waitForTimeout(250);

  expect(simulationPostCount).toBe(1);

  await page.goto("/simulations");

  await expect(
    page.getByRole("heading", {
      name: "TCP run history",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", {
      name: runLabel,
    }),
  ).toBeVisible();

  expect(simulationPostCount).toBe(1);
});

test("scenario run remains in history after the scenario is deleted", async ({
  page,
}) => {
  const scenarioName =
    `E2E TCP scenario ${Date.now()}`;

  await page.goto("/scenarios");

  await expect(
    page.getByRole("heading", {
      name: "Saved TCP scenarios",
    }),
  ).toBeVisible();

  await page
    .getByLabel("Scenario name")
    .fill(scenarioName);

  const createScenarioResponsePromise =
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        hasPath(
          response.url(),
          "/api/v1/scenarios",
        ) &&
        response.status() === 201,
    );

  await page
    .getByRole("button", {
      name: "Save scenario",
    })
    .click();

  const createScenarioResponse =
    await createScenarioResponsePromise;

  const createdScenario =
    (await createScenarioResponse.json()) as {
      id: number;
      name: string;
    };

  await expect(
    page.getByText(
      `Scenario "${scenarioName}" was saved.`,
      {
        exact: true,
      },
    ),
  ).toBeVisible();

  const scenarioCard = page
    .locator("article")
    .filter({
      has: page.getByRole("heading", {
        name: scenarioName,
      }),
    });

  await expect(scenarioCard).toBeVisible();

  const runScenarioResponsePromise =
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        hasPath(
          response.url(),
          `/api/v1/scenarios/${createdScenario.id}/run`,
        ) &&
        response.status() === 201,
    );

  await scenarioCard
    .getByRole("button", {
      name: "Run scenario",
    })
    .click();

  const runScenarioResponse =
    await runScenarioResponsePromise;

  const createdRun =
    (await runScenarioResponse.json()) as {
      id: number;
    };

  const runLabel = `Run #${createdRun.id}`;

  await expect(
    page.getByRole("heading", {
      name: runLabel,
    }),
  ).toBeVisible();

  await scenarioCard
    .getByRole("button", {
      name: "Delete",
    })
    .click();

  const deleteDialog = page.getByRole(
    "alertdialog",
    {
      name: "Delete this scenario?",
    },
  );

  await expect(deleteDialog).toBeVisible();

  const deleteScenarioResponsePromise =
    page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        hasPath(
          response.url(),
          `/api/v1/scenarios/${createdScenario.id}`,
        ) &&
        response.status() === 204,
    );

  await deleteDialog
    .getByRole("button", {
      name: "Delete scenario",
    })
    .click();

  await deleteScenarioResponsePromise;

  await expect(
    page.getByText(
      `Scenario "${scenarioName}" was deleted.`,
      {
        exact: true,
      },
    ),
  ).toBeVisible();

  await expect(scenarioCard).toHaveCount(0);

  await page.goto("/simulations");

  await expect(
    page.getByRole("heading", {
      name: "TCP run history",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", {
      name: runLabel,
    }),
  ).toBeVisible();

  await expect(
    page.getByText("Direct run", {
      exact: true,
    }),
  ).toBeVisible();
});