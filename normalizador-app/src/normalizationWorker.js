
self.onmessage = function(e) {
  const { uniqueList, processedRef, persistentCache, streetsData } = e.data;
  const correctionsMap = {};
  const toProcessWithAI = [];

  const getSimilarity = (tWords, refWords) => {
    const intersection = tWords.filter(w => refWords.includes(w));
    return intersection.length / Math.max(tWords.length, 1);
  };

  uniqueList.forEach(target => {
    const t = target.trim();
    
    if (persistentCache[t]) {
      correctionsMap[t] = persistentCache[t];
      return;
    }

    const tLower = t.toLowerCase();
    const exactMatch = streetsData.find(s => s.toLowerCase() === tLower);
    if (exactMatch) {
      correctionsMap[t] = exactMatch;
      return;
    }

    const tWords = tLower.split(/\s+/).filter(w => w.length > 2);
    let bestMatch = { ref: '', score: 0 };
    
    processedRef.forEach(item => {
      const score = getSimilarity(tWords, item.words);
      if (score > bestMatch.score) {
        bestMatch = { ref: item.original, score };
      }
    });

    if (bestMatch.score >= 0.95) {
      correctionsMap[target] = bestMatch.ref;
    } else {
      toProcessWithAI.push(target);
    }
  });

  self.postMessage({ correctionsMap, toProcessWithAI });
};
