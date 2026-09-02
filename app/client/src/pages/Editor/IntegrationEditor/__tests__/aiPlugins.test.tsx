import React from "react";
import { ReduxActionTypes } from "ee/constants/ReduxActionConstants";
import store from "store";
import { render, screen } from "test/testUtils";
import { PluginPackageName } from "entities/Plugin";
import AIPlugins from "../AIPlugins";
import { changeLocale } from "i18n";

const aiPlugins = [
  {
    id: "appsmith-ai-plugin-id",
    name: "Appsmith AI",
    type: "AI",
    packageName: PluginPackageName.APPSMITH_AI,
    iconLocation: "",
  },
  {
    id: "openai-plugin-id",
    name: "OpenAI",
    type: "AI",
    packageName: "openai-plugin",
    iconLocation: "",
  },
];

describe("AIPlugins create-new list", () => {
  afterEach(async () => {
    await changeLocale("zh-CN");
  });

  it("hides deprecated Appsmith AI but keeps other AI plugins", () => {
    store.dispatch({
      type: ReduxActionTypes.FETCH_PLUGINS_SUCCESS,
      payload: aiPlugins,
    });

    const { container } = render(
      <AIPlugins pageId="pageId" showUnsupportedPluginDialog={() => {}} />,
    );

    // BYOK AI plugins must remain creatable
    expect(
      container.querySelector(".t--createBlankApi-openai-plugin"),
    ).not.toBeNull();
    // The deprecated managed Appsmith AI plugin must not be offered for creation
    expect(
      container.querySelector(
        `.t--createBlankApi-${PluginPackageName.APPSMITH_AI}`,
      ),
    ).toBeNull();
  });

  it("updates the section heading when the locale changes", async () => {
    await changeLocale("en-US");
    store.dispatch({
      type: ReduxActionTypes.FETCH_PLUGINS_SUCCESS,
      payload: aiPlugins,
    });

    render(
      <AIPlugins pageId="pageId" showUnsupportedPluginDialog={() => {}} />,
    );
    expect(screen.getByText("AI Integrations")).toBeTruthy();

    await changeLocale("zh-CN");
    expect(screen.getByText("AI 集成")).toBeTruthy();
  });
});
