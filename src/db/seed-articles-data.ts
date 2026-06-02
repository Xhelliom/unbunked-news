import type { ClaimStatus } from "@/lib/claim-status";
import type { Verdict } from "@/lib/verdicts";

// Demo content for src/db/seed-articles.ts. Kept here so the seed script
// itself stays under the 500-line cap.

export type SeedSource = { url: string; title: string };

export type SeedClaim = {
  // The assertion under examination (shown as the quote on the claim card).
  claimText: string;
  status: ClaimStatus;
  explanation: string;
  // A verbatim excerpt of `text`; the reading view anchors the claim to its
  // paragraph by matching this against the body.
  anchor: string;
  sources: SeedSource[];
};

export type SeedParagraph = {
  text: string;
  // A single claim, or several (e.g. a paragraph mixing statuses).
  claim?: SeedClaim;
  claims?: SeedClaim[];
};

export type SeedArticle = {
  slug: string;
  sourceName: string;
  sourceUrl: string;
  tagSlug: string;
  verdict: Verdict;
  reliabilityScore: number;
  // Core sub-scores default to reliabilityScore when omitted; the optional ones
  // stay null (the AI couldn't rate them) unless given an explicit value.
  factualityScore?: number;
  sourcingScore?: number;
  neutralityScore?: number;
  completenessScore?: number | null;
  transparencyScore?: number | null;
  recencyScore?: number | null;
  publishedAt: string;
  title: string;
  originalTitle: string;
  summary: string;
  // Neutral paraphrase of what the original article says (our words).
  originalSummary: string;
  // When false, the public page hides the full annotated body and shows
  // originalSummary instead. Omitted = default true.
  showOriginal?: boolean;
  body: SeedParagraph[];
};

export const TAGS = [
  { slug: "tech", label: "Tech", color: "#6366F1" },
  { slug: "politics", label: "Politique", color: "#0ea5e9" },
  { slug: "environment", label: "Environnement", color: "#059669" },
  { slug: "health", label: "Santé", color: "#ec4899" },
];

export const ARTICLES: SeedArticle[] = [
  {
    slug: "dette-publique-double-six-mois",
    sourceName: "Le Figaro",
    sourceUrl: "https://lefigaro.fr/economie/dette-publique-double",
    tagSlug: "politics",
    verdict: "debunked",
    reliabilityScore: 18,
    factualityScore: 12,
    sourcingScore: 25,
    neutralityScore: 30,
    completenessScore: 28,
    transparencyScore: 45,
    publishedAt: "2026-05-12",
    title: "Non, la dette publique n'a pas doublé en six mois",
    originalTitle:
      "Le tour de passe-passe budgétaire qui a doublé la dette en six mois",
    summary:
      "Le chiffre cité par plusieurs élus repose sur une lecture glissante mal calibrée. Les chiffres officiels de l'INSEE et de la Banque de France racontent une autre histoire — la dette a augmenté de 2,4 points de PIB sur la période, pas de 100 %.",
    originalSummary:
      "L'article du Figaro affirme qu'un haut fonctionnaire anonyme a constaté un doublement de la dette publique française entre novembre et avril, de 3 100 à 6 200 milliards d'euros. Il y voit le résultat d'un « tour de passe-passe budgétaire » lié à un changement d'agrégat comptable, et appelle à une réaction politique immédiate.",
    showOriginal: false,
    body: [
      {
        text: "Plusieurs responsables politiques ont affirmé cette semaine que la dette publique française aurait « doublé en six mois », une formule reprise telle quelle par Le Figaro dans son édition de mardi, puis relayée des milliers de fois sur les réseaux sociaux. La phrase est frappante, facile à retenir et politiquement commode. Elle est aussi, à la lecture des données publiques, tout simplement fausse — et l'écart entre l'affirmation et les chiffres réels est si large qu'il mérite d'être détaillé pas à pas.",
      },
      {
        text: "L'auteur de l'article s'appuie sur un « haut fonctionnaire » qu'il ne nomme jamais pour soutenir que la dette nominale serait passée de 3 100 à 6 200 milliards d'euros entre novembre et avril, soit un doublement pur et simple en l'espace de deux trimestres. Aucune source documentaire n'accompagne ce chiffre, qui constitue pourtant le cœur de la démonstration et le titre de l'article.",
        claim: {
          claimText:
            "La dette nominale serait passée de 3 100 à 6 200 milliards d'euros",
          status: "false",
          explanation:
            "Les bulletins mensuels de l'Agence France Trésor donnent 3 217 milliards d'euros en novembre puis 3 296 milliards en avril — une variation de 2,5 %, pas un doublement. Le chiffre de 6 200 milliards n'apparaît dans aucune publication officielle.",
          anchor:
            "la dette nominale serait passée de 3 100 à 6 200 milliards d'euros",
          sources: [
            { title: "Bulletin AFT, avril 2026", url: "https://aft.gouv.fr" },
            {
              title: "Note INSEE — comptes nationaux trimestriels",
              url: "https://insee.fr",
            },
          ],
        },
      },
      {
        text: "Les bulletins mensuels de l'Agence France Trésor, publics et téléchargeables, racontent une tout autre histoire : 3 217 milliards d'euros encourus fin novembre, 3 296 milliards fin avril. La progression est réelle, et elle est légitime à discuter, mais elle se mesure en dizaines de milliards, pas en milliers. Rapportée au PIB, la dette a augmenté d'environ 2,4 points sur la période — un rythme proche de celui des deux années précédentes.",
      },
      {
        text: "Pour parvenir à son chiffre spectaculaire, le raisonnement de l'article repose sur une comparaison entre la dette brute et la dette nette d'actifs financiers, deux agrégats comptables qui n'ont jamais été équivalents et que les économistes manient avec d'infinies précautions. Mettre l'un en regard de l'autre, comme si la différence représentait une « explosion » récente, revient à comparer le chiffre d'affaires d'une entreprise à son bénéfice net et à crier au scandale.",
        claim: {
          claimText: "Comparaison entre dette brute et dette nette d'actifs",
          status: "misleading",
          explanation:
            "Confondre dette brute et dette nette n'est pas une erreur arithmétique mais un cadrage qui exagère mécaniquement la variation. Les deux agrégats mesurent des choses différentes et ne se soustraient pas l'un à l'autre pour produire un « bond ».",
          anchor:
            "une comparaison entre la dette brute et la dette nette d'actifs financiers",
          sources: [
            {
              title: "Méthodologie INSEE — comptes nationaux",
              url: "https://insee.fr/methodologie",
            },
          ],
        },
      },
      {
        text: "Cette technique de présentation n'est pas anodine. En choisissant deux points de mesure éloignés, deux définitions différentes et une fenêtre temporelle courte, on peut faire dire à peu près n'importe quoi à une série statistique. C'est précisément ce que recommande de ne pas faire l'INSEE dans ses notes méthodologiques, qui insistent sur la cohérence des périmètres d'une mesure à l'autre.",
      },
      {
        text: "Contactée, la direction générale du Trésor a fermement démenti l'existence d'un quelconque doublement et renvoyé vers ses publications mensuelles. Le Figaro, sollicité à deux reprises, n'a pas répondu à nos demandes d'éclaircissement avant la publication de cette analyse. Le journaliste signataire n'a pas davantage précisé l'identité du « haut fonctionnaire » cité.",
      },
      {
        text: "Reste une question de fond, indépendante du chiffre erroné : la trajectoire de la dette française est un sujet de débat légitime et sérieux. Mais le débat ne gagne rien à être ouvert sur un faux. Une augmentation de 2,4 points de PIB se discute ; un doublement imaginaire ne se discute pas, il se corrige.",
      },
    ],
  },
  {
    slug: "ia-medecins-diagnostic-90-pourcent",
    sourceName: "Numerama",
    sourceUrl: "https://numerama.com/sciences/ia-medecins",
    tagSlug: "tech",
    verdict: "nuanced",
    reliabilityScore: 64,
    factualityScore: 75,
    sourcingScore: 62,
    neutralityScore: 38,
    completenessScore: 58,
    recencyScore: 70,
    publishedAt: "2026-05-19",
    title: "L'IA bat-elle vraiment les médecins à 90 % au diagnostic ?",
    originalTitle:
      "Cette IA diagnostique mieux que 90 % des médecins, selon une étude",
    summary:
      "L'étude existe, le chiffre est exact dans son contexte — mais elle compare un modèle à des médecins qui n'avaient ni dossier patient, ni examen physique, ni le droit de poser une question. Un comparatif équitable change tout.",
    originalSummary:
      "Numerama relaie une étude parue dans Nature Medicine selon laquelle un modèle d'IA atteindrait 88,7 % de précision diagnostique contre 71,2 % pour un panel de médecins. Le site en conclut que cette IA « diagnostique mieux que 90 % des médecins » et envisage des bouleversements pour la médecine de première ligne.",
    body: [
      {
        text: "Une étude publiée dans Nature Medicine a fait le tour des rédactions tech en quelques jours, portée par un chiffre spectaculaire : un modèle de langage atteindrait 88,7 % de précision sur un jeu de vignettes cliniques, contre 71,2 % pour un échantillon de praticiens. Numerama en a tiré un titre sans appel — « cette IA diagnostique mieux que 90 % des médecins » — qui mérite d'être confronté à ce que dit réellement l'article scientifique.",
      },
      {
        text: "Premier point, et il est important : le chiffre central n'est pas inventé. Le modèle atteint bien 88,7 % de précision et les médecins 71,2 % sur ce protocole précis. Ces valeurs figurent dans le tableau 2 de l'étude originale et ont été reproduites par un second groupe de recherche travaillant indépendamment sur le même jeu de données. Sur ce point, l'article de Numerama est exact.",
        claim: {
          claimText: "88,7 % de précision pour le modèle, 71,2 % pour les médecins",
          status: "supported",
          explanation:
            "Le chiffre figure dans le tableau 2 de l'étude originale et a été reproduit par un second groupe de recherche. Les valeurs ne sont pas contestées.",
          anchor:
            "88,7 % de précision sur un jeu de vignettes cliniques, contre 71,2 % pour un échantillon de praticiens",
          sources: [
            {
              title: "Nature Medicine, 2026 — Diagnostic accuracy of LLMs",
              url: "https://nature.com/nm",
            },
          ],
        },
      },
      {
        text: "Le problème surgit lorsque l'on passe du protocole à sa généralisation. Le titre de Numerama transforme un résultat obtenu dans des conditions très particulières en une affirmation sur la pratique médicale courante — exactement ce que les auteurs eux-mêmes refusent de faire dans la section « discussion » de leur article, où ils multiplient les mises en garde.",
        claim: {
          claimText: "Bat les médecins à 90 % au diagnostic",
          status: "partly_true",
          explanation:
            "Vrai sur le protocole de l'étude, faux comme énoncé général : le modèle ne disposait pas plus que les médecins du dossier patient, mais le cadre de la vignette écrite avantage une machine entraînée sur du texte. Pas d'examen physique, pas de suivi, pas d'imagerie.",
          anchor:
            "transforme un résultat obtenu dans des conditions très particulières en une affirmation sur la pratique médicale courante",
          sources: [
            {
              title: "Nature Medicine — Section 4, limites de l'étude",
              url: "https://nature.com/nm#limits",
            },
          ],
        },
      },
      {
        text: "Le détail décisif tient au cadre de l'évaluation. Le panel de médecins ne pouvait poser aucune question complémentaire, ne disposait d'aucun examen clinique et travaillait uniquement sur des vignettes écrites — un format qui correspond mieux à ce qu'un modèle de langage sait traiter qu'à la réalité d'une consultation. Or c'est précisément l'interrogatoire, le geste et le suivi dans le temps qui font le diagnostic médical.",
      },
      {
        text: "Plusieurs spécialistes interrogés rappellent qu'une comparaison équitable supposerait de donner aux deux camps les mêmes outils : soit priver le médecin de tout, comme ici, soit doter le modèle d'un véritable parcours patient. Aucune des deux conditions ne reflète l'exercice réel, et les auteurs le savent — d'où la prudence de leur conclusion, perdue en route dans la reprise médiatique.",
      },
      {
        text: "Reste un acquis solide : sur le tri initial de symptômes décrits par écrit, ces modèles sont devenus très performants, et c'est en soi une nouvelle marquante. Mais « performant sur des vignettes » et « meilleur que les médecins » sont deux phrases différentes. La première est exacte ; la seconde, telle qu'elle circule, ne l'est pas tout à fait.",
      },
    ],
  },
  {
    slug: "energie-eolien-rendement-2050",
    sourceName: "Le Monde",
    sourceUrl: "https://lemonde.fr/energie/eolien-2050",
    tagSlug: "environment",
    verdict: "reliable",
    reliabilityScore: 91,
    factualityScore: 95,
    sourcingScore: 90,
    neutralityScore: 88,
    completenessScore: 92,
    transparencyScore: 85,
    recencyScore: 90,
    publishedAt: "2026-05-21",
    title:
      "Éolien offshore : les chiffres de RTE pour 2050 résistent à la vérification",
    originalTitle:
      "Éolien offshore : RTE confirme le scénario de 22 GW à horizon 2050",
    summary:
      "Toutes les affirmations centrales de l'article sont sourcées et conformes aux dernières publications de RTE et de l'AIE. Une seule projection est marquée nuancée, sur le facteur de charge moyen.",
    originalSummary:
      "Le Monde rend compte du dernier scénario de RTE pour l'éolien offshore français : 22 GW de capacité installée à horizon 2050, des coûts d'investissement détaillés, et un facteur de charge moyen de 46 %. L'article positionne l'offshore comme un pilier crédible du mix énergétique français à long terme.",
    body: [
      {
        text: "Les projections énergétiques sont un terrain miné pour la vérification : les horizons sont lointains, les hypothèses nombreuses et les chiffres faciles à sortir de leur contexte. C'est ce qui rend l'article du Monde sur l'éolien offshore remarquable — sur l'essentiel, il colle aux sources officielles, et nos vérifications confirment l'écrasante majorité de ses affirmations.",
      },
      {
        text: "Le pivot de l'article est l'objectif de capacité installée. RTE confirme dans son rapport « Futurs énergétiques 2050 » un objectif de 22 GW de capacité éolienne offshore installée à horizon 2050, chiffre que Le Monde reprend sans le déformer. La trajectoire intermédiaire citée pour 2035 correspond, elle aussi, aux jalons publiés par le gestionnaire de réseau.",
        claim: {
          claimText: "22 GW de capacité éolienne offshore à horizon 2050",
          status: "supported",
          explanation:
            "Chiffre identique à la page 47 du rapport RTE publié en mars 2026. La trajectoire intermédiaire 2035 est également cohérente avec les jalons officiels.",
          anchor: "un objectif de 22 GW de capacité éolienne offshore installée à horizon 2050",
          sources: [
            {
              title: "RTE — Futurs énergétiques 2050",
              url: "https://rte-france.com/futurs-2050",
            },
          ],
        },
      },
      {
        text: "L'article rappelle ensuite les coûts d'investissement attendus et la part de l'offshore dans le mix final. Ces deux éléments sont cohérents avec les fourchettes publiées par l'Agence internationale de l'énergie, et l'article a la sagesse de présenter des intervalles plutôt que des valeurs uniques — une précaution rare dans la couverture de ces sujets.",
      },
      {
        text: "Une seule projection appelle une nuance. Le facteur de charge moyen retenu de 46 % se situe dans la fourchette haute des estimations européennes, et tout repose sur cette hypothèse pour le calcul de production annuelle. Ce n'est pas une erreur, mais un choix optimiste qu'il aurait fallu signaler comme tel.",
        claim: {
          claimText: "Facteur de charge moyen de 46 %",
          status: "partly_true",
          explanation:
            "La fourchette de l'AIE pour 2025 va de 38 % à 48 % selon les zones et la génération de turbines. 46 % est plausible mais se situe dans le haut de la fourchette : la production annoncée en dépend directement.",
          anchor: "Le facteur de charge moyen retenu de 46 %",
          sources: [
            {
              title: "IEA Wind TCP — Annual Report 2025",
              url: "https://iea-wind.org/2025",
            },
          ],
        },
      },
      {
        text: "Sur la partie raccordement et calendrier, enfin, l'article reste prudent et cite explicitement les incertitudes liées aux délais d'autorisation. C'est exactement le ton que ces sujets appellent : des chiffres solides, des intervalles honnêtes, et une seule hypothèse à surveiller. D'où un score de fiabilité élevé.",
      },
    ],
  },
  {
    slug: "supplement-magnesium-sommeil",
    sourceName: "Doctissimo",
    sourceUrl: "https://doctissimo.fr/sommeil/magnesium",
    tagSlug: "health",
    verdict: "fragile",
    reliabilityScore: 41,
    factualityScore: 68,
    sourcingScore: 50,
    neutralityScore: 22,
    completenessScore: 38,
    transparencyScore: 55,
    recencyScore: 60,
    publishedAt: "2026-05-08",
    title:
      "Le magnésium améliore-t-il vraiment le sommeil ? Le cadrage de l'article",
    originalTitle: "Magnésium : la solution simple pour mieux dormir",
    summary:
      "Le bénéfice existe pour les sujets carencés, mais l'article omet systématiquement les essais négatifs et présente une méta-analyse minoritaire comme un consensus. Cadrage orienté.",
    originalSummary:
      "Doctissimo présente le magnésium comme une « solution simple » pour mieux dormir. L'article s'appuie sur une méta-analyse de 2022 portant sur 7 essais et conclut, en s'adressant au grand public, qu'une supplémentation quotidienne améliore la latence d'endormissement. Un lien vers une boutique partenaire conclut le texte.",
    body: [
      {
        text: "« La solution simple pour mieux dormir » : le titre de Doctissimo promet beaucoup, et l'article tient sa promesse de ton, sinon de rigueur. Le problème n'est pas qu'il invente des faits — la plupart des études citées existent — mais qu'il choisit avec soin lesquelles montrer, et lesquelles passer sous silence. C'est le manuel du cadrage orienté.",
      },
      {
        text: "L'article s'appuie principalement sur une méta-analyse de 2022 portant sur 7 essais cliniques, qui conclut à un effet modéré du magnésium sur la latence d'endormissement. Cette étude existe bel et bien, elle est correctement citée, et ses résultats sont réels pour la population qu'elle examine. Rien à redire sur ce point précis.",
        claim: {
          claimText: "Méta-analyse de 7 essais cliniques",
          status: "supported",
          explanation:
            "L'étude existe et est correctement citée. Ses résultats sont réels pour la population étudiée — essentiellement des sujets âgés présentant une carence.",
          anchor: "une méta-analyse de 2022 portant sur 7 essais cliniques",
          sources: [
            {
              title: "Sleep Medicine Reviews, 2022",
              url: "https://sleepmedreviews.org/2022",
            },
          ],
        },
      },
      {
        text: "Ce que l'article ne dit pas, en revanche, change tout. Trois revues Cochrane plus récentes et nettement plus larges concluent à un effet absent ou marginal en population générale — et aucune n'est mentionnée. Or ce sont précisément les revues les plus solides méthodologiquement, celles qu'un article honnête citerait en premier, ne serait-ce que pour les discuter.",
        claim: {
          claimText: "« Le magnésium améliore le sommeil »",
          status: "misleading",
          explanation:
            "Vrai chez les sujets carencés, faux comme énoncé général. L'omission des essais négatifs et des revues Cochrane les plus larges n'est pas un oubli : elle est constitutive d'un cadrage orienté qui transforme un effet de niche en remède universel.",
          anchor:
            "Trois revues Cochrane plus récentes et nettement plus larges concluent à un effet absent ou marginal",
          sources: [
            { title: "Cochrane Review, 2024", url: "https://cochrane.org/2024" },
            {
              title: "BMJ Evidence-Based Medicine",
              url: "https://ebm.bmj.com",
            },
          ],
        },
      },
      {
        text: "La distinction est pourtant simple à formuler honnêtement : chez une personne réellement carencée en magnésium, une supplémentation peut aider, parce qu'on corrige un déficit. Chez une personne dont les apports sont normaux, le bénéfice attendu est proche de zéro. Confondre les deux situations, c'est promettre à tout le monde un effet qui ne concerne qu'une minorité.",
      },
      {
        text: "S'ajoute, en fin d'article, un lien vers une boutique partenaire vendant le complément en question. Rien d'illégal, mais l'angle commercial éclaire le choix éditorial : on ne cadre pas un sujet de la même manière selon que l'on cherche à informer ou à vendre. Le verdict « orienté » ne porte pas sur les faits cités, qui sont exacts, mais sur leur sélection.",
      },
    ],
  },
  {
    slug: "iphone-batterie-mise-a-jour",
    sourceName: "Frandroid",
    sourceUrl: "https://frandroid.com/marques/apple/iphone-batterie",
    tagSlug: "tech",
    verdict: "unverifiable",
    reliabilityScore: 52,
    publishedAt: "2026-05-26",
    title: "iOS 19.2 use-t-il la batterie plus vite ? Le bruit ne suffit pas",
    originalTitle:
      "iOS 19.2 : la mise à jour qui détruit l'autonomie des iPhone",
    summary:
      "Les témoignages sont nombreux sur les forums, mais aucune mesure publique n'a été produite à ce jour. Apple n'a pas répondu. L'affirmation reste invérifiable en l'état.",
    originalSummary:
      "Frandroid relaie des plaintes nombreuses d'utilisateurs d'iPhone 13 et 14 sur les forums d'assistance Apple : depuis l'installation d'iOS 19.2, l'autonomie de l'appareil chuterait nettement. L'article décrit le phénomène comme une « destruction » de la batterie liée à la mise à jour et appelle Apple à réagir.",
    body: [
      {
        text: "« La mise à jour qui détruit l'autonomie » : le titre de Frandroid ne fait pas dans la demi-mesure. Le phénomène décrit est réel au sens où il est rapporté par de nombreux utilisateurs ; mais « rapporté » et « démontré » sont deux statuts différents, et c'est tout l'objet de cette vérification que de les distinguer.",
      },
      {
        text: "Plusieurs centaines de témoignages signalent une autonomie en baisse après l'installation d'iOS 19.2 sur iPhone 13 et 14, sur les forums d'assistance comme sur les réseaux sociaux. Le volume est suffisamment important pour qu'on ne puisse pas l'écarter d'un revers de main — mais il ne constitue pas, en soi, une mesure.",
        claim: {
          claimText: "Autonomie en baisse après iOS 19.2",
          status: "unverifiable",
          explanation:
            "Aucune mesure publique reproductible n'a été produite à ce jour. Les bancs de test indépendants (AnandTech, Notebookcheck) n'ont pas encore publié de comparaison avant/après sur les mêmes appareils. Le signal est réel, la preuve manque.",
          anchor:
            "une autonomie en baisse après l'installation d'iOS 19.2 sur iPhone 13 et 14",
          sources: [],
        },
      },
      {
        text: "Le biais classique guette ici : après une mise à jour, les utilisateurs sont plus attentifs à leur batterie, et un effet de réindexation des données consomme temporairement plus d'énergie pendant un ou deux jours, avant de rentrer dans l'ordre. Distinguer une régression durable d'un artefact transitoire demande une mesure dans le temps, sur un échantillon contrôlé — ce que personne n'a encore publié.",
      },
      {
        text: "Du côté d'Apple, le silence est total. La firme n'a publié aucune note de version mentionnant un changement de gestion énergétique sur ces modèles, et n'a pas répondu à nos sollicitations. Cette absence de réponse n'est ni une confirmation, ni un démenti : elle laisse simplement la question ouverte.",
      },
      {
        text: "Notre verdict n'est donc pas « c'est faux », mais « on ne peut pas encore trancher ». C'est un statut inconfortable à l'ère des titres tranchés, et pourtant c'est le seul honnête tant que les mesures manquent. Nous mettrons cette analyse à jour dès que des tests reproductibles seront disponibles.",
      },
    ],
  },
  {
    slug: "transports-paris-15-euros-mois",
    sourceName: "Libération",
    sourceUrl: "https://liberation.fr/economie/transports-paris",
    tagSlug: "politics",
    verdict: "reliable",
    reliabilityScore: 86,
    publishedAt: "2026-05-23",
    title: "Pass Navigo à 15 € : le chiffrage budgétaire tient la route",
    originalTitle: "Pass Navigo à 15 €/mois : le coût réel pour la Région",
    summary:
      "Les hypothèses de Libération sur le coût d'un Navigo plafonné à 15 € correspondent aux chiffres publiés par IDFM et par la Cour des comptes. Une projection 2027 reste à confirmer.",
    originalSummary:
      "Libération chiffre la promesse politique d'un Pass Navigo plafonné à 15 € par mois : un coût annuel d'environ 1,2 milliard d'euros pour la Région Île-de-France, recoupé avec une note de la Cour des comptes. L'article présente la mesure comme finançable sous conditions, en explicitant ses hypothèses de fréquentation.",
    body: [
      {
        text: "Proposer un Pass Navigo à 15 euros par mois est une promesse politique séduisante — et donc une cible naturelle pour la vérification, tant ce type d'annonce s'accompagne rarement d'un chiffrage solide. L'article de Libération fait exception : il avance un coût, en expose les hypothèses, et celles-ci résistent à l'examen.",
      },
      {
        text: "Le cœur du chiffrage est le coût annuel pour la collectivité. Le coût annuel pour la Région Île-de-France est estimé à 1,2 milliard d'euros, un montant conforme aux chiffres publiés par Île-de-France Mobilités dans son rapport budgétaire de février. L'article précise par ailleurs les hypothèses de fréquentation retenues, ce qui permet de refaire le calcul.",
        claim: {
          claimText: "Coût annuel de 1,2 milliard d'euros",
          status: "supported",
          explanation:
            "Identique au rapport IDFM de février 2026. Les hypothèses de fréquentation retenues par l'article sont explicites et cohérentes avec les données de billettique publiées.",
          anchor: "estimé à 1,2 milliard d'euros",
          sources: [
            {
              title: "IDFM — Rapport budgétaire 2026",
              url: "https://iledefrance-mobilites.fr/budget-2026",
            },
          ],
        },
      },
      {
        text: "L'article croise ensuite ce montant avec une note de la Cour des comptes sur le financement des transports franciliens, et les ordres de grandeur concordent. C'est un point fort : plutôt que de s'appuyer sur une source unique, Libération recoupe deux institutions dont les méthodes diffèrent, et obtient un résultat cohérent.",
      },
      {
        text: "Une réserve subsiste sur la projection à 2027, qui suppose une hausse de fréquentation difficile à garantir et dépend de décisions de financement non encore actées. L'article a le mérite de la présenter comme une hypothèse, et non comme un fait. C'est cette honnêteté de cadrage, autant que l'exactitude des chiffres, qui justifie un score de fiabilité élevé.",
      },
    ],
  },
  {
    slug: "ia-empreinte-carbone-greenit",
    sourceName: "Usbek & Rica",
    sourceUrl: "https://usbeketrica.com/numerique/empreinte-carbone-ia",
    tagSlug: "environment",
    verdict: "nuanced",
    reliabilityScore: 58,
    publishedAt: "2026-05-27",
    title: "L'empreinte carbone de l'IA : ce que dit (et ne dit pas) l'étude",
    originalTitle: "L'IA, ce gouffre énergétique qui pèse déjà 4 % du carbone du numérique",
    summary:
      "L'ordre de grandeur de l'empreinte du numérique est plausible, mais l'article empile une estimation haute et un chiffre sur l'IA qu'aucune source publique ne permet encore d'établir. Un même paragraphe mélange ainsi le vérifiable et l'invérifiable.",
    originalSummary:
      "Usbek & Rica rapporte une étude présentée comme un signal d'alarme : le numérique mondial pèserait 1,8 milliard de tonnes éq. CO₂ (soit 4 % des émissions globales), et les serveurs d'IA en représenteraient déjà 4 %. L'article décrit l'IA comme un « gouffre énergétique » dont la trajectoire reste sous-évaluée par les pouvoirs publics.",
    body: [
      {
        text: "L'empreinte écologique du numérique est devenue un sujet de couverture régulier, et chaque nouvelle étude tend à produire un chiffre-choc. L'article d'Usbek & Rica ne fait pas exception, mais il a le défaut de mélanger dans une même phrase un ordre de grandeur défendable et une extrapolation que rien ne vient étayer.",
      },
      {
        // One paragraph, two claims of different statuses → gradient bar + two
        // inline highlights (amber "partly_true" + grey "unverifiable").
        text: "Après avoir posé que le numérique est responsable, à l'échelle mondiale, de l'émission de 1,8 milliard de tonnes éq. CO2 — soit environ 4 % des émissions globales —, l'étude affirme dans la foulée que les serveurs dédiés à l'intelligence artificielle représentent déjà 4 % de cette empreinte, un raccourci qui demande à être examiné de près.",
        claims: [
          {
            claimText:
              "Le numérique est responsable, à l'échelle mondiale, de l'émission de 1,8 milliard de tonnes éq. CO2",
            status: "partly_true",
            explanation:
              "Les estimations du secteur TIC varient fortement selon les méthodologies : de 730 millions à plusieurs milliards de tonnes CO2-éq. Le chiffre de 1,8 milliard est plausible mais se situe vers le haut de la fourchette ; il aurait fallu le présenter comme une estimation, pas comme un fait établi.",
            anchor:
              "le numérique est responsable, à l'échelle mondiale, de l'émission de 1,8 milliard de tonnes éq. CO2",
            sources: [
              {
                title: "The carbon footprint of ICT — Nature, 2024",
                url: "https://nature.com/ict-footprint",
              },
              {
                title: "AI and data-centre energy use — IEA, 2025",
                url: "https://iea.org/ai-energy",
              },
            ],
          },
          {
            claimText:
              "Les serveurs dédiés à l'intelligence artificielle représentent déjà 4 % de l'empreinte du numérique",
            status: "unverifiable",
            explanation:
              "Aucune source publique ne permet d'isoler la part exacte de l'IA dans l'empreinte du numérique : les fournisseurs de cloud ne publient pas ce découpage, et les estimations indépendantes reposent sur des hypothèses non vérifiables. Le chiffre de 4 % circule sans référence primaire.",
            anchor:
              "les serveurs dédiés à l'intelligence artificielle représentent déjà 4 % de cette empreinte",
            sources: [],
          },
        ],
      },
      {
        text: "Le problème n'est pas que ces chiffres soient nécessairement faux, mais qu'ils soient présentés côte à côte avec le même degré de certitude alors qu'ils ne reposent pas du tout sur les mêmes fondations. Le premier s'appuie sur une littérature abondante quoique dispersée ; le second sur une estimation isolée que ses propres auteurs présentent comme exploratoire.",
      },
      {
        text: "Interrogé, le collectif à l'origine de l'étude reconnaît que la part attribuée à l'IA est « un ordre de grandeur provisoire » destiné à « ouvrir le débat », formulation nettement plus prudente que celle retenue dans le titre de l'article. C'est exactement le glissement que la vérification cherche à rendre visible.",
      },
    ],
  },
];
