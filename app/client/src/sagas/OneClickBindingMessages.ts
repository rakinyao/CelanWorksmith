export function oneClickBindingSuccessMessage(actionNames: string[]) {
  return `Successfully created action${actionNames.length > 1 ? "s" : ""}: ${actionNames.join(", ")}`;
}

export function oneClickBindingFailureMessage(errorMessage: string) {
  return `Failed to bind widget: ${errorMessage}`;
}
