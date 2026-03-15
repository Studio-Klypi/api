export function compileFilter<T>(filter: string) {
  const parts = filter.split(',');
  return parts.reduce((acc, curr) => {
    acc = [...acc, curr as T];
    return acc;
  }, [] as T[]);
}
