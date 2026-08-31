import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "selectors/themeSelectors";
import { i18n } from "i18n";
import { unitTestBaseMockStore } from "layoutSystems/common/dropTarget/unitTestUtils";
import ApplicationCard from "./ApplicationCard";

jest.mock("@appsmith/ads", () => {
  const actual = jest.requireActual("@appsmith/ads");

  return {
    ...actual,
    Menu: ({ children }: any) => <div>{children}</div>,
    MenuTrigger: ({ children }: any) => <div>{children}</div>,
    MenuContent: ({ children }: any) => <div>{children}</div>,
    MenuItem: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    Divider: () => <hr />,
  };
});

jest.mock("components/common/Card", () => ({
  __esModule: true,
  default: ({ children, contextMenu, title }: any) => (
    <div>
      <span>{title}</span>
      {contextMenu}
      {children}
    </div>
  ),
  ContextMenuTrigger: React.forwardRef((props: any, ref: any) => (
    <button ref={ref} {...props} />
  )),
}));

jest.mock("utils/storage", () => ({
  getLatestGitBranchFromLocal: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("ee/selectors/applicationSelectors", () => {
  const actual = jest.requireActual("ee/selectors/applicationSelectors");

  return {
    ...actual,
    getIsSavingAppName: () => false,
    getIsErroredSavingAppName: () => false,
  };
});

jest.mock("ee/utils/permissionHelpers", () => {
  const actual = jest.requireActual("ee/utils/permissionHelpers");

  return {
    ...actual,
    hasDeleteApplicationPermission: () => true,
    isPermitted: () => true,
  };
});

const mockStore = configureStore([]);
const store = mockStore({
  ...unitTestBaseMockStore,
  ui: {
    ...unitTestBaseMockStore.ui,
    applications: {
      ...unitTestBaseMockStore.ui.applications,
      forkingApplication: false,
    },
    selectedWorkspace: {
      ...unitTestBaseMockStore.ui.selectedWorkspace,
      loadingStates: { isFetchingApplications: false },
    },
    users: {
      ...unitTestBaseMockStore.ui.users,
      featureFlag: { data: {}, overriddenFlags: {} },
    },
  },
  entities: {
    ...unitTestBaseMockStore.entities,
    users: { currentUser: {} },
  },
});

const application = {
  id: "app-1",
  baseId: "app-1",
  name: "Inventory",
  slug: "inventory",
  applicationVersion: 1,
  defaultPageId: "507f1f77bcf86cd799439011",
  defaultBasePageId: "507f1f77bcf86cd799439011",
  pages: [
    {
      id: "507f1f77bcf86cd799439011",
      baseId: "507f1f77bcf86cd799439011",
      slug: "home",
    },
  ],
  modifiedAt: "2024-01-01T00:00:00.000Z",
  modifiedBy: "gavin",
  userPermissions: [
    "manage:applications",
    "read:applications",
    "export:applications",
    "delete:applications",
  ],
} as any;

function renderCard() {
  return render(
    <Provider store={store}>
      <ThemeProvider theme={lightTheme}>
        <ApplicationCard
          application={application}
          delete={jest.fn()}
          enableImportExport
          isFetchingApplications={false}
          share={jest.fn()}
          update={jest.fn()}
          workspaceId="workspace-1"
        />
      </ThemeProvider>
    </Provider>,
  );
}

describe("ApplicationCard localization", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en-US");
  });

  it.each([
    ["en-US", ["Share app", "Fork app", "Export", "Delete"]],
    ["zh-CN", ["分享应用", "复制应用", "导出", "删除"]],
  ])("renders application actions in %s", async (locale, labels) => {
    await i18n.changeLanguage(locale);
    renderCard();
    await waitFor(() => {
      labels.forEach((label) =>
        expect(screen.getByText(label)).toBeInTheDocument(),
      );
    });
  });
});
