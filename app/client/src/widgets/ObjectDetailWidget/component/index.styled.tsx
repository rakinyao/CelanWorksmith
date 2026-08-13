import styled from "styled-components";

export const ObjectDetailContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 8px;
  color: #231f20;
  background: #ffffff;
  font-size: 12px;
`;

export const StateMessage = styled.div`
  display: flex;
  min-height: 100%;
  align-items: center;
  justify-content: center;
  color: #6b7280;
`;

export const MetadataNotice = styled.div`
  margin-bottom: 8px;
  color: #92400e;
`;

export const PropertyGroup = styled.section`
  margin-bottom: 12px;

  dl {
    margin: 0;
  }
`;

export const GroupTitle = styled.h3`
  margin: 0 0 4px;
  font-size: 12px;
`;

export const PropertyRow = styled.div`
  display: grid;
  grid-template-columns: minmax(96px, 40%) 1fr;
  gap: 8px;
  padding: 3px 0;
  border-bottom: 1px solid #e5e7eb;
`;

export const PropertyLabel = styled.dt`
  margin: 0;
  color: #6b7280;
`;

export const PropertyValue = styled.dd`
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const LinkTabs = styled.div`
  display: flex;
  gap: 4px;
  margin: 8px 0;
  border-bottom: 1px solid #d1d5db;
`;

export const LinkDetails = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 6px 0;
  color: #4b5563;
`;

export const LinkTab = styled.button<{ $active: boolean }>`
  padding: 4px 8px;
  color: ${(props) => (props.$active ? "#1d4ed8" : "#374151")};
  background: transparent;
  border: 0;
  border-bottom: 2px solid
    ${(props) => (props.$active ? "#1d4ed8" : "transparent")};
  cursor: pointer;
`;

export const LinkedObjectButton = styled.button`
  display: grid;
  grid-template-columns: minmax(64px, auto) minmax(0, 1fr);
  gap: 8px;
  width: 100%;
  padding: 6px 0;
  text-align: left;
  color: #1d4ed8;
  background: transparent;
  border: 0;
  cursor: pointer;
`;

export const LinkedObjectId = styled.span`
  font-weight: 600;
`;

export const LinkedObjectSummary = styled.span`
  min-width: 0;
  overflow: hidden;
  color: #4b5563;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const LinkError = styled.div`
  color: #b91c1c;
`;
