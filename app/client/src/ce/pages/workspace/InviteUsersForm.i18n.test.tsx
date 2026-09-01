import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "test/testUtils";
import { changeLocale } from "i18n";
import { INVITE_USERS_TO_WORKSPACE_FORM } from "ee/constants/forms";
import {
  getFormError,
  getFormSyncErrors,
  getFormValues,
  change,
  stopSubmit,
} from "redux-form";
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

  it("preserves a server error while refreshing validation after a locale switch", async () => {
    await changeLocale("en-US");
    render(<InviteUsersForm workspaceId="workspace-id" />);

    store.dispatch(
      change(INVITE_USERS_TO_WORKSPACE_FORM, "users", "not-an-email"),
    );
    store.dispatch(
      stopSubmit(INVITE_USERS_TO_WORKSPACE_FORM, {
        _error: "Unable to invite users",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("Unable to invite users")).toBeInTheDocument();
    });
    expect(
      getFormSyncErrors(INVITE_USERS_TO_WORKSPACE_FORM)(store.getState()).users,
    ).toBe("Invalid email address(es) found");
    expect(
      getFormValues(INVITE_USERS_TO_WORKSPACE_FORM)(store.getState()),
    ).toEqual({ users: "not-an-email" });

    await changeLocale("zh-CN");

    await waitFor(() =>
      expect(
        getFormError(INVITE_USERS_TO_WORKSPACE_FORM)(store.getState()),
      ).toBe("Unable to invite users"),
    );
    expect(screen.getByText("Unable to invite users")).toBeInTheDocument();
    expect(
      getFormSyncErrors(INVITE_USERS_TO_WORKSPACE_FORM)(store.getState()).users,
    ).toBe("发现无效的邮箱地址");
    expect(
      getFormValues(INVITE_USERS_TO_WORKSPACE_FORM)(store.getState()),
    ).toEqual({ users: "not-an-email" });
  });
});
