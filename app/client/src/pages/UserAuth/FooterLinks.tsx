import React from "react";
import { Link } from "@appsmith/ads";
import styled from "styled-components";
import { useTranslation } from "react-i18next";

const FooterWrapper = styled.div`
  width: 85%;
  margin: 0 auto;
  text-align: center;
  a {
    display: inline;
    span {
      display: inline;
      svg {
        display: inline;
      }
    }
  }
`;

function FooterLinks() {
  const { t } = useTranslation();

  return (
    <FooterWrapper>
      {t("footer.usingAppsmithAgreement")} &nbsp;
      <Link target="_blank" to="/privacy-policy.html">
        {t("footer.privacyPolicy")}
      </Link>
      &nbsp; {t("footer.and")} &nbsp;
      <Link target="_blank" to="/terms-and-conditions.html">
        {t("footer.termsOfService")}
      </Link>
      .
    </FooterWrapper>
  );
}

export default FooterLinks;
