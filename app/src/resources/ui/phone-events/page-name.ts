const PAGE_NAME_PATTERN = /^[a-z0-9-]{1,40}$/;

export function pageFromPath(pathname: string): string {
  const section =
    pathname
      .split("/")
      .find((part) => part !== "")
      ?.toLowerCase() ?? "inicio";
  return PAGE_NAME_PATTERN.test(section) ? section : "otra";
}
