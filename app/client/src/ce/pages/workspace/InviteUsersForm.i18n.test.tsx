import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "test/testUtils";
import { changeLocale } from "i18n";
import { INVITE_USERS_TO_WORKSPACE_FORM } from "ee/constants/forms";
import { getFormSyncErrors, getFormValues } from "redux-form";
import store from "store";
import InviteUsersForm from "./InviteUsersForm";

describe("InviteUsersForm translations", () => {
  afterEach(async () => {
    await changeLocale("en-US");
  });

  it("mounts the connected form with its redux-form values", async () => {
    await changeLocale("en-US");

    render(<InviteUsersForm workspaceId="workspace-id" />);

    expect(
      screen.getByPlaceholderText("Enter email address(es)"),
    ).toBeInTheDocument();
  });

  it("updates visible empty-field validation after a locale switch", async () => {
    await changeLocale("en-US");
    render(<InviteUsersForm workspaceId="workspace-id" />);

    expect(
      getFormSyncErrors(INVITE_USERS_TO_WORKSPACE_FORM)(store.getState()).users,
    ).toBe("Please enter the user emails");
    expect(
      getFormValues(INVITE_USERS_TO_WORKSPACE_FORM)(store.getState()),
    ).toBeUndefined();

    await changeLocale("zh-CN");

    await waitFor(() => {
      expect(
        getFormSyncErrors(INVITE_USERS_TO_WORKSPACE_FORM)(store.getState())
          .users,
      ).toBe("请输入用户邮箱");
    });
    expect(
      getFormValues(INVITE_USERS_TO_WORKSPACE_FORM)(store.getState()),
    ).toBeUndefined();
  });
});
