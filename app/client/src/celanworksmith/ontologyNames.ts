export interface OntologyNameMetadata {
  id: string;
  displayName: string;
  localizedName?: string;
  chineseName?: string;
  nameZh?: string;
}

export interface OntologyNamePresentation {
  id: string;
  label: string;
  searchText: string;
}

const getTrimmedAliases = (metadata: OntologyNameMetadata) =>
  [
    metadata.displayName,
    metadata.localizedName,
    metadata.chineseName,
    metadata.nameZh,
  ]
    .filter((name): name is string => typeof name === "string")
    .map((name) => name.trim())
    .filter(Boolean)
    .filter((name, index, names) => names.indexOf(name) === index);

export const getOntologyNamePresentation = (
  metadata: OntologyNameMetadata,
): OntologyNamePresentation => {
  const aliases = getTrimmedAliases(metadata);
  const id = metadata.id;
  const label = aliases.join(" / ") || id;
  const searchText = [...aliases, id]
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(" ");

  return { id, label, searchText };
};
