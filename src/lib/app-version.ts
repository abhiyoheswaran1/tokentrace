import packageJson from "@/package.json";

export function getAppVersion() {
  return packageJson.version;
}

export function formatAppVersion(version = getAppVersion()) {
  return `v${version}`;
}
