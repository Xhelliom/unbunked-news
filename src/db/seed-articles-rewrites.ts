export type SeedRewrite = { title: string; body: string };
export type SeedRewrites = Record<string, { fr: SeedRewrite; en: SeedRewrite }>;

// Demo rewrites for the seed articles, one per locale. Body is markdown; the
// [[claim:N]] markers are 1-based and reference the claim insertion order in
// seed-articles.ts (the same order as they appear in each body[]).
export const REWRITES: SeedRewrites = {
  "dette-publique-double-six-mois": {
    fr: {
      title: "La dette n'a pas doublé : ce que disent les chiffres officiels",
      body:
        "## Un titre frappant, un chiffre faux\n\n" +
        "Plusieurs responsables politiques, repris cette semaine par *Le Figaro*, ont affirmé que la dette publique française aurait « doublé en six mois ». La formule a circulé largement, mais elle ne résiste pas à une lecture des publications officielles. [[claim:1]]\n\n" +
        "## Ce que disent les bulletins de l'AFT\n\n" +
        "Les bulletins mensuels de l'Agence France Trésor donnent **3 217 milliards d'euros** fin novembre et **3 296 milliards** fin avril : une variation d'environ 2,5 %, pas un doublement. Rapportée au PIB, la dette a augmenté d'environ 2,4 points sur la période, dans la continuité des deux années précédentes.\n\n" +
        "## Le piège du cadrage\n\n" +
        "Le chiffre spectaculaire de l'article repose sur une comparaison entre dette brute et dette nette d'actifs financiers — deux agrégats qui ne mesurent pas la même chose et qu'aucune méthodologie sérieuse n'autorise à soustraire ainsi. [[claim:2]] Le débat sur la trajectoire budgétaire est légitime ; il ne gagne rien à être ouvert sur un faux.",
    },
    en: {
      title: "France's debt did not double: what the official numbers show",
      body:
        "## A striking headline, a false figure\n\n" +
        "Several French politicians, echoed this week by *Le Figaro*, claimed that public debt had \"doubled in six months.\" The line travelled fast, but it does not survive a look at the official publications. [[claim:1]]\n\n" +
        "## What the Treasury bulletins say\n\n" +
        "The monthly bulletins of Agence France Trésor report **€3,217 billion** at end-November and **€3,296 billion** at end-April: a roughly 2.5 % change, not a doubling. As a share of GDP, debt rose by about 2.4 points over the period — in line with the two previous years.\n\n" +
        "## The framing trap\n\n" +
        "The piece's headline figure comes from juxtaposing gross debt with debt net of financial assets — two aggregates that measure different things and that no serious methodology subtracts in this way. [[claim:2]] The budget trajectory is a legitimate debate; it gains nothing from being opened on a false premise.",
    },
  },

  "ia-medecins-diagnostic-90-pourcent": {
    fr: {
      title: "L'IA face aux médecins : ce que dit vraiment l'étude",
      body:
        "## Un chiffre exact, mais sorti de son cadre\n\n" +
        "Une étude publiée dans *Nature Medicine* indique qu'un modèle de langage atteint **88,7 %** de précision sur un jeu de vignettes cliniques, contre **71,2 %** pour un échantillon de praticiens. [[claim:1]] Ces valeurs figurent bien dans le tableau 2 de l'article et sont reproductibles. Sur ce point précis, la couverture médiatique est exacte.\n\n" +
        "## Pourquoi le titre dérape\n\n" +
        "Là où le glissement commence, c'est dans la généralisation. « L'IA bat les médecins » suppose un terrain commun — or les praticiens évalués ne pouvaient ni poser de questions, ni examiner, ni consulter un dossier patient. Ils répondaient à des vignettes écrites, c'est-à-dire au format dans lequel un modèle de langage est précisément le plus performant. [[claim:2]]\n\n" +
        "## L'acquis et le malentendu\n\n" +
        "Sur le tri initial de symptômes décrits par écrit, ces modèles sont devenus très performants : c'est un progrès réel qui mérite d'être noté. Mais « excellent sur des vignettes » et « meilleur que les médecins » sont deux énoncés différents, et seul le premier est exact en l'état des données disponibles.",
    },
    en: {
      title: "AI vs doctors: what the study actually shows",
      body:
        "## A real figure, taken out of context\n\n" +
        "A *Nature Medicine* study finds that a language model reaches **88.7 %** accuracy on a set of clinical vignettes, against **71.2 %** for a panel of physicians. [[claim:1]] These values are in Table 2 of the original paper and have been independently reproduced. On that specific point, the press coverage is correct.\n\n" +
        "## Where the headline slips\n\n" +
        "The drift starts with the generalisation. \"AI beats doctors\" implies a level playing field — but the clinicians in the study could not ask questions, perform any examination, or look at a chart. They were given written vignettes, the exact format on which a language model performs best. [[claim:2]]\n\n" +
        "## The real progress, and the misunderstanding\n\n" +
        "On triaging text-based symptom descriptions, these models have become very capable: that is a genuine advance worth noting. But \"excellent on vignettes\" and \"better than doctors\" are two different claims, and only the first is supported by the available evidence.",
    },
  },

  "energie-eolien-rendement-2050": {
    fr: {
      title: "Éolien offshore 2050 : un chiffrage qui tient la route",
      body:
        "## Une trajectoire alignée sur les sources officielles\n\n" +
        "L'objectif de **22 GW** de capacité éolienne offshore à horizon 2050, central dans l'article du *Monde*, est conforme aux jalons publiés par RTE dans son rapport « Futurs énergétiques 2050 ». [[claim:1]] La trajectoire intermédiaire pour 2035 est elle aussi cohérente avec les documents officiels.\n\n" +
        "## Coûts et part dans le mix : dans les fourchettes\n\n" +
        "Les coûts d'investissement et la part de l'offshore dans le mix final cités par l'article correspondent aux fourchettes publiées par l'Agence internationale de l'énergie. Le choix de présenter des intervalles plutôt que des valeurs uniques est une précaution rare et bienvenue dans la couverture de ces sujets.\n\n" +
        "## La seule réserve : le facteur de charge\n\n" +
        "Une nuance reste à apporter sur le facteur de charge moyen retenu de **46 %**, qui se situe dans la fourchette haute des estimations européennes. [[claim:2]] Ce n'est pas une erreur, mais une hypothèse optimiste qu'il aurait été honnête de signaler comme telle, puisque toute la production annoncée en dépend.",
    },
    en: {
      title: "Offshore wind to 2050: a credible costing",
      body:
        "## A trajectory aligned with official sources\n\n" +
        "The **22 GW** offshore wind capacity target by 2050, central to *Le Monde*'s article, matches the milestones in RTE's \"Futurs énergétiques 2050\" report. [[claim:1]] The 2035 intermediate trajectory is also consistent with official figures.\n\n" +
        "## Costs and share of the mix: within the bands\n\n" +
        "The investment costs and the share of offshore in the final mix cited by the article fall within the ranges published by the International Energy Agency. Presenting intervals rather than single values is an unusually careful choice for this kind of coverage.\n\n" +
        "## One reservation: capacity factor\n\n" +
        "A nuance remains on the **46 %** average capacity factor used in the projection, which sits at the upper end of European estimates. [[claim:2]] Not an error, but an optimistic assumption that should have been flagged as such, since the annual production figure depends entirely on it.",
    },
  },

  "supplement-magnesium-sommeil": {
    fr: {
      title: "Magnésium et sommeil : un effet réel, mais pas pour tout le monde",
      body:
        "## Une étude correctement citée, mais une seule\n\n" +
        "L'article de *Doctissimo* s'appuie sur une méta-analyse de 2022 portant sur 7 essais cliniques, qui conclut à un effet modéré du magnésium sur la latence d'endormissement. Cette étude existe, ses chiffres sont exacts, et son résultat est réel pour la population qu'elle examine — essentiellement des sujets âgés présentant une carence. [[claim:1]]\n\n" +
        "## Ce que l'article passe sous silence\n\n" +
        "Trois revues Cochrane plus récentes, et nettement plus larges, concluent à un effet absent ou marginal en population générale. Aucune n'est mentionnée dans l'article — alors qu'elles constituent précisément la littérature la plus robuste sur le sujet. [[claim:2]]\n\n" +
        "## La distinction qui change tout\n\n" +
        "Chez une personne réellement carencée, une supplémentation peut aider parce qu'on corrige un déficit. Chez quelqu'un dont les apports sont normaux, le bénéfice attendu est proche de zéro. Confondre ces deux situations transforme un effet de niche en remède universel : c'est un cadrage orienté, pas une erreur factuelle.",
    },
    en: {
      title: "Magnesium and sleep: a real effect, but not for everyone",
      body:
        "## A correctly cited study — but only one\n\n" +
        "The *Doctissimo* piece relies on a 2022 meta-analysis of 7 clinical trials, which finds a moderate effect of magnesium on sleep latency. The study exists, the figures are accurate, and the result is real for the population it looked at — mostly older subjects with a deficiency. [[claim:1]]\n\n" +
        "## What the article leaves out\n\n" +
        "Three more recent and substantially larger Cochrane reviews conclude that the effect is absent or marginal in the general population. None are mentioned in the article — yet they are precisely the most methodologically robust literature on the topic. [[claim:2]]\n\n" +
        "## The distinction that changes everything\n\n" +
        "In someone with an actual deficiency, supplementation can help because it corrects a deficit. In someone with normal intake, the expected benefit is close to zero. Conflating the two situations turns a niche effect into a universal remedy: that is selective framing, not a factual error.",
    },
  },

  "iphone-batterie-mise-a-jour": {
    fr: {
      title: "iOS 19.2 et autonomie : un signal réel, sans preuve à ce jour",
      body:
        "## Beaucoup de témoignages, pas encore de mesures\n\n" +
        "Plusieurs centaines d'utilisateurs d'iPhone 13 et 14 signalent une autonomie en baisse après l'installation d'iOS 19.2. Le volume des signalements est suffisamment important pour qu'on ne puisse pas les écarter, mais aucune mesure publique reproductible n'a été publiée à ce stade. [[claim:1]]\n\n" +
        "## Un biais classique à garder en tête\n\n" +
        "Après une mise à jour, deux phénomènes coexistent : un effet d'attention accrue (on regarde sa batterie plus souvent) et une réindexation des données qui consomme temporairement plus d'énergie sur 24 à 48 heures. Distinguer une régression durable d'un artefact transitoire suppose une mesure dans le temps, sur un échantillon contrôlé — exactement ce qui manque ici.\n\n" +
        "## Le silence d'Apple ne tranche rien\n\n" +
        "Apple n'a publié aucune note de version mentionnant un changement de gestion énergétique sur ces modèles, et n'a pas répondu à nos sollicitations. Ce silence n'est ni une confirmation, ni un démenti : il laisse la question ouverte. Notre verdict est donc « invérifiable », pas « faux ».",
    },
    en: {
      title: "iOS 19.2 and battery life: a real signal, no evidence yet",
      body:
        "## Many reports, no measurements yet\n\n" +
        "Several hundred iPhone 13 and 14 users report shorter battery life after installing iOS 19.2. The volume is high enough that it can't be dismissed, but no reproducible public measurement has been published so far. [[claim:1]]\n\n" +
        "## A familiar bias to keep in mind\n\n" +
        "Two things happen after a major update: people pay more attention to their battery, and a data-reindexing pass temporarily uses extra power for 24-48 hours. Telling a lasting regression apart from a transient artefact requires longitudinal measurement on a controlled sample — which is exactly what's missing here.\n\n" +
        "## Apple's silence settles nothing\n\n" +
        "Apple has not published any release notes mentioning a power-management change on these models, and did not respond to our queries. That silence is neither confirmation nor denial: it leaves the question open. Our verdict, therefore, is \"unverifiable\" — not \"false.\"",
    },
  },

  "transports-paris-15-euros-mois": {
    fr: {
      title: "Pass Navigo à 15 € : un chiffrage qui résiste à l'examen",
      body:
        "## Un coût cohérent avec les sources officielles\n\n" +
        "Le coût annuel pour la Région Île-de-France d'un Pass Navigo plafonné à 15 €, estimé à **1,2 milliard d'euros** par *Libération*, correspond aux chiffres publiés par Île-de-France Mobilités dans son rapport budgétaire de février. [[claim:1]] Les hypothèses de fréquentation retenues sont explicites, ce qui permet de refaire le calcul.\n\n" +
        "## Un recoupement avec la Cour des comptes\n\n" +
        "L'article croise ensuite ce montant avec une note de la Cour des comptes sur le financement des transports franciliens, et les ordres de grandeur concordent. Plutôt que de s'appuyer sur une source unique, *Libération* recoupe deux institutions dont les méthodes diffèrent, et obtient un résultat cohérent — c'est exactement ce qu'on attend d'un chiffrage solide.\n\n" +
        "## Une réserve, présentée comme telle\n\n" +
        "Une incertitude subsiste sur la projection à 2027, qui suppose une hausse de fréquentation difficile à garantir. L'article a le mérite de la présenter comme une hypothèse, et non comme un fait acquis. C'est cette honnêteté de cadrage, autant que l'exactitude des chiffres, qui justifie un score de fiabilité élevé.",
    },
    en: {
      title: "A €15 monthly pass: a costing that holds up",
      body:
        "## A figure aligned with official sources\n\n" +
        "*Libération* estimates the annual cost to the Île-de-France region of capping the Navigo pass at €15 per month at **€1.2 billion**, a figure matching what Île-de-France Mobilités published in its February budget report. [[claim:1]] The article spells out the ridership assumptions, so the maths can be reproduced.\n\n" +
        "## Cross-checked against the Court of Auditors\n\n" +
        "*Libération* then cross-checks the figure against a Cour des comptes note on Paris-region transport financing, and the orders of magnitude line up. Rather than leaning on one source, the article triangulates two institutions with different methods, and lands on consistent numbers — exactly what a solid costing should look like.\n\n" +
        "## One reservation, honestly framed\n\n" +
        "An uncertainty remains on the 2027 projection, which assumes a ridership increase that is far from guaranteed. The article presents this as a hypothesis, not as a settled fact. That honesty of framing, as much as the accuracy of the figures, is what earns a high reliability score.",
    },
  },

  "ia-empreinte-carbone-greenit": {
    fr: {
      title: "Empreinte carbone de l'IA : un chiffre solide, un autre fragile",
      body:
        "## Un ordre de grandeur défendable pour le numérique\n\n" +
        "L'étude reprise par *Usbek & Rica* avance que le numérique mondial émet environ **1,8 milliard de tonnes éq. CO₂**, soit 4 % des émissions globales. Le chiffre est plausible, mais il se situe vers le haut de la fourchette des estimations publiées (de 730 millions à plusieurs milliards de tonnes selon les méthodologies). Il aurait fallu le présenter comme une estimation, pas comme un fait établi. [[claim:1]]\n\n" +
        "## Une extrapolation sur l'IA qui ne tient pas\n\n" +
        "Le même paragraphe affirme que les serveurs dédiés à l'IA représentent déjà 4 % de cette empreinte. Aucune source publique ne permet aujourd'hui d'isoler cette part : les fournisseurs de cloud ne publient pas ce découpage, et les estimations indépendantes reposent sur des hypothèses non vérifiables. Le chiffre circule sans référence primaire. [[claim:2]]\n\n" +
        "## Le glissement de cadrage\n\n" +
        "Le problème n'est pas que ces deux chiffres soient nécessairement faux, mais qu'ils soient présentés côte à côte avec le même degré de certitude alors qu'ils ne reposent pas du tout sur les mêmes fondations. Les auteurs de l'étude reconnaissent eux-mêmes que la part attribuée à l'IA est « un ordre de grandeur provisoire » — formulation absente du titre.",
    },
    en: {
      title: "AI's carbon footprint: one solid figure, one shaky one",
      body:
        "## A defensible order of magnitude for digital overall\n\n" +
        "The study cited by *Usbek & Rica* puts global digital emissions at around **1.8 billion tonnes CO₂-eq**, or 4 % of total emissions. The figure is plausible but sits at the upper end of the published range (from 730 million to several billion tonnes, depending on methodology). It should have been presented as an estimate, not a settled fact. [[claim:1]]\n\n" +
        "## An AI extrapolation that doesn't hold\n\n" +
        "The same paragraph claims that AI-dedicated servers already account for 4 % of that footprint. No public source today lets you isolate that share: cloud providers don't publish the breakdown, and independent estimates rest on assumptions that can't be verified. The figure circulates without a primary reference. [[claim:2]]\n\n" +
        "## The framing slip\n\n" +
        "The problem isn't that these two figures are necessarily wrong, but that they are presented side-by-side with the same degree of certainty even though they do not rest on the same foundations. The study's authors themselves call the AI share \"a provisional order of magnitude\" — a caveat missing from the article's headline.",
    },
  },
};
