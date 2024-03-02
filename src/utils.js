import * as d3 from 'd3'

export function randomChars (n) {
  /* Return n random chars.
    If n is undefined, randomnly chooses n.
  */
  const all = 'abcdefghijklmnopqrstuvwxyz'
  // all chars as array of objects [{position: 0, char: 'a'}, {position: 1, char: 'a'}, ....]
  const allObjects = all.split('').map((c, i) => {
    return {
      position: i,
      char: c
    }
  })
  const shuffled = d3.shuffle(allObjects) // randomly shuffle the arrray
  if (n == undefined) {
    n = Math.floor(Math.random() * all.length)
  }
  return shuffled.slice(0, n)
}
