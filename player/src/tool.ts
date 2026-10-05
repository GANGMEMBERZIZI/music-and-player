export function getRandomIntInclusive(min: number, max: number): number {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1)) + minCeiled;
}
export function formate(time:number):string{
        const m=Math.floor(time/60).toString().padStart(2, '0');
        const s=Math.floor(time%60).toString().padStart(2, '0');
        return `${m}:${s}`;
} 