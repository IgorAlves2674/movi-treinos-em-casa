/** Confere o banco de exercícios. Uso: npm run check:content */
import { EXERCICIOS, validarExercicios } from '../src/content/exercises';

const erros = validarExercicios();
if (erros.length) {
  console.error(`✖ ${erros.length} problema(s) no banco de exercícios:`);
  for (const e of erros) console.error('  - ' + e);
  process.exit(1);
}
console.log(`✔ ${EXERCICIOS.length} exercícios conferidos, nenhum problema.`);
