function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function addClaudeCandidates(name: string, candidates: string[]) {
  const lower = name.toLowerCase();

  const datedFamilyFirst = lower.match(/^(claude)-(opus|sonnet|haiku)-(\d+)-(\d+)-\d{8}$/);
  if (datedFamilyFirst) {
    const [, prefix, family, major, minor] = datedFamilyFirst;
    candidates.push(`${prefix}-${family}-${major}-${minor}`);
    candidates.push(`${prefix}-${family}-${major}.${minor}`);
  }

  const datedVersionFirst = lower.match(/^(claude)-(\d+)-(\d+)-(opus|sonnet|haiku)-\d{8}$/);
  if (datedVersionFirst) {
    const [, prefix, major, minor, family] = datedVersionFirst;
    candidates.push(`${prefix}-${family}-${major}-${minor}`);
    candidates.push(`${prefix}-${family}-${major}.${minor}`);
  }

  const legacyDated = lower.match(/^(claude)-(\d+)-(opus|sonnet|haiku)-\d{8}$/);
  if (legacyDated) {
    const [, prefix, major, family] = legacyDated;
    candidates.push(`${prefix}-${family}-${major}`);
  }

  const strippedDate = lower.replace(/-\d{8}$/, "");
  if (strippedDate !== lower) candidates.push(strippedDate);

  const familyHyphenVersion = strippedDate.match(/^(claude)-(opus|sonnet|haiku)-(\d+)-(\d+)$/);
  if (familyHyphenVersion) {
    const [, prefix, family, major, minor] = familyHyphenVersion;
    candidates.push(`${prefix}-${family}-${major}.${minor}`);
  }
}

export function modelNameCandidates(modelName: string | null | undefined) {
  const trimmed = modelName?.trim();
  if (!trimmed) return ["unknown"];

  const candidates = [trimmed];
  addClaudeCandidates(trimmed, candidates);

  return unique(candidates);
}
