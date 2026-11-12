import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import config from './firebase-applet-config.json';

async function main() {
  const app = initializeApp(config);
  const db = getFirestore(app, config.firestoreDatabaseId);

  const pelSnap = await getDocs(collection(db, 'pelanggan'));
  const allPel = pelSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const opsPel = allPel.filter((p: any) => p.opsId === 'ops-1793501923423');

  const distinctDates = Array.from(new Set(opsPel.map((p: any) => p.tanggalMulai)));
  console.log('Distinct tanggalMulai in opsPel:', distinctDates);

  distinctDates.forEach(d => {
    const count = opsPel.filter((p: any) => p.tanggalMulai === d).length;
    console.log(`  Date ${d}: ${count} customers`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
