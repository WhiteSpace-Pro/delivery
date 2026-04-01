function inferCombo(name: string) {
  let qty_pizzas = 1;
  if (name.startsWith("2 ")) qty_pizzas = 2;
  else if (name.startsWith("1 ")) qty_pizzas = 1;

  let size: 'G' | 'GG' | null = null;
  if (name.includes('GG') || name.toLowerCase().includes('gigante')) {
    size = 'GG';
  } else if (name.includes(' G ') || name.includes('G +') || name.endsWith(' G')) {
    size = 'G';
  }

  return { qty_pizzas, size };
}

const tests = [
  { name: "1 Pizza G + Kuat 2L", expected: { qty_pizzas: 1, size: 'G'  } },
  { name: "1 Pizza G + Coca 2L", expected: { qty_pizzas: 1, size: 'G'  } },
  { name: "1 Pizza GG + Kuat 2L", expected: { qty_pizzas: 1, size: 'GG' } },
  { name: "1 Pizza GG + Coca 2L", expected: { qty_pizzas: 1, size: 'GG' } },
  { name: "2 Pizza G + Kuat 2L", expected: { qty_pizzas: 2, size: 'G'  } },
  { name: "2 Pizza G + Coca 2L", expected: { qty_pizzas: 2, size: 'G'  } },
  { name: "2 Pizza Gigante + Kuat 2L", expected: { qty_pizzas: 2, size: 'GG' } },
  { name: "2 Pizza Gigante + Coca 2L", expected: { qty_pizzas: 2, size: 'GG' } },
];

tests.forEach(t => {
  const result = inferCombo(t.name);
  if (JSON.stringify(result) !== JSON.stringify(t.expected)) {
    console.error(`Test failed for "${t.name}": expected ${JSON.stringify(t.expected)}, got ${JSON.stringify(result)}`);
    process.exit(1);
  }
});

console.log("All inferCombo tests passed!");
