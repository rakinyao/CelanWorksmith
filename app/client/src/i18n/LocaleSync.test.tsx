import React from "react";
import { render } from "@testing-library/react";
import { useSelector } from "react-redux";
import LocaleSync from "./LocaleSync";
import { changeLocale, getLocale } from "./index";

jest.mock("react-redux", () => ({
  useSelector: jest.fn(),
}));

jest.mock("./index", () => {
  const actual = jest.requireActual("./index");
  return { ...actual, changeLocale: jest.fn(), getLocale: jest.fn() };
});

const mockedUseSelector = useSelector as jest.Mock;
const mockedChangeLocale = changeLocale as jest.Mock;
const mockedGetLocale = getLocale as jest.Mock;

describe("LocaleSync", () => {
  beforeEach(() => {
    mockedUseSelector.mockReturnValue({ locale: "en-US" });
    mockedGetLocale.mockReturnValue("zh-CN");
    mockedChangeLocale.mockClear();
  });

  it("applies a valid authenticated-user locale after state loads", async () => {
    render(<LocaleSync />);

    expect(mockedChangeLocale).toHaveBeenCalledWith("en-US");
  });
});
