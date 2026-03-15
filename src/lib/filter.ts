export function compileFilter<T>(filter: string) {
  filter = filter.trim();

  if (!filter.length) return [] as T[];
  if (!filter.includes(',')) return [filter] as T[];

  console.log(filter);

  const parts = filter.split(',');
  return parts.reduce((acc, curr) => {
    acc = [...acc, curr as T];
    return acc;
  }, [] as T[]);
}
