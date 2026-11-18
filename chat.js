// Vercel serverless endpoint. Configure OPENAI_API_KEY in Vercel project settings.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({error:'Bruk POST.'});
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({error:'OPENAI_API_KEY mangler i Vercel → Settings → Environment Variables.'});
  const {message, level, program, subject} = req.body || {};
  if (typeof message !== 'string' || !message.trim() || message.length > 2000) return res.status(400).json({error:'Skriv et spørsmål på maks 2000 tegn.'});
  const safe = x => typeof x === 'string' ? x.slice(0,100) : '';
  try {
    const controller = new AbortController(); const timer=setTimeout(()=>controller.abort(),20000);
    let response;
    try { response = await fetch('https://api.openai.com/v1/responses', {method:'POST',signal:controller.signal,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',max_output_tokens:650,instructions:`Du er Skolehjelpen, en trygg norsk læringsassistent. Svar på norsk, kort og tydelig. Tilpass nivået til ${safe(level)}, utdanningsprogram ${safe(program)}, fag ${safe(subject)}. Hjelp eleven med hint, forklaringer og eksempler fremfor å gjøre hele innleveringer. Still ett oppfølgingsspørsmål når det hjelper læringen. Ikke påstå at du har sjekket Udir eller kompetansemål uten å ha kildegrunnlag. Oppgi usikkerhet.`,input:message})});} finally {clearTimeout(timer)}
    const data=await response.json();
    if(!response.ok) return res.status(502).json({error:response.status===429?'AI-tjenesten er midlertidig opptatt eller har nådd en grense.':'AI-tjenesten svarte med en feil. Sjekk API-nøkkel og fakturering.'});
    const reply=(data.output||[]).flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('\n').trim();
    return res.status(200).json({reply:reply||'Jeg fikk ikke generert et svar. Prøv igjen.'});
  }catch(e){return res.status(502).json({error:e.name==='AbortError'?'Forespørselen tok for lang tid. Prøv igjen.':'Kunne ikke kontakte AI-tjenesten.'})}
};
