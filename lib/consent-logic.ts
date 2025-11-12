/**
 * Logique métier pour les décisions par consentement
 *
 * Ce module gère le calcul des stades, des transitions et des résultats
 * pour les décisions de type CONSENT.
 */

import { ConsentStage, ConsentStepMode } from '@/types/enums'

/**
 * Timings pour un stade de décision
 */
export interface StageTimings {
  stage: ConsentStage
  startDate: Date
  endDate: Date
  isActive: boolean
  isPast: boolean
  isFuture: boolean
}

/**
 * Résultat du calcul des timings pour tous les stades
 */
export interface AllStageTimings {
  clarifications?: StageTimings
  avis?: StageTimings
  clarifavis?: StageTimings
  amendements: StageTimings
  objections: StageTimings
  terminee?: StageTimings
}

/**
 * Calcule les dates de début et de fin pour chaque stade
 *
 * @param startDate - Date de lancement de la décision
 * @param endDate - Date limite de la décision
 * @param mode - Mode de déroulement (MERGED ou DISTINCT)
 * @returns Timings pour chaque stade
 */
export function calculateConsentStageTimings(
  startDate: Date,
  endDate: Date,
  mode: ConsentStepMode
): AllStageTimings {
  const start = startDate.getTime()
  const end = endDate.getTime()
  const totalDuration = end - start
  const now = Date.now()

  if (mode === 'MERGED') {
    // Mode MERGED: CLARIFAVIS (2/3) → AMENDEMENTS (1/9) → OBJECTIONS (2/9)
    const clarifavisEnd = start + (totalDuration * 2) / 3
    const amendementsEnd = clarifavisEnd + (totalDuration * 1) / 9
    const objectionsEnd = end

    const clarifavisTimings: StageTimings = {
      stage: 'CLARIFAVIS',
      startDate: new Date(start),
      endDate: new Date(clarifavisEnd),
      isActive: now >= start && now < clarifavisEnd,
      isPast: now >= clarifavisEnd,
      isFuture: now < start,
    }

    const amendementsTimings: StageTimings = {
      stage: 'AMENDEMENTS',
      startDate: new Date(clarifavisEnd),
      endDate: new Date(amendementsEnd),
      isActive: now >= clarifavisEnd && now < amendementsEnd,
      isPast: now >= amendementsEnd,
      isFuture: now < clarifavisEnd,
    }

    const objectionsTimings: StageTimings = {
      stage: 'OBJECTIONS',
      startDate: new Date(amendementsEnd),
      endDate: new Date(objectionsEnd),
      isActive: now >= amendementsEnd && now < objectionsEnd,
      isPast: now >= objectionsEnd,
      isFuture: now < amendementsEnd,
    }

    return {
      clarifavis: clarifavisTimings,
      amendements: amendementsTimings,
      objections: objectionsTimings,
    }
  } else {
    // Mode DISTINCT: CLARIFICATIONS (1/3) → AVIS (1/3) → AMENDEMENTS (1/9) → OBJECTIONS (2/9)
    const clarificationsEnd = start + totalDuration / 3
    const avisEnd = clarificationsEnd + totalDuration / 3
    const amendementsEnd = avisEnd + (totalDuration * 1) / 9
    const objectionsEnd = end

    const clarificationsTimings: StageTimings = {
      stage: 'CLARIFICATIONS',
      startDate: new Date(start),
      endDate: new Date(clarificationsEnd),
      isActive: now >= start && now < clarificationsEnd,
      isPast: now >= clarificationsEnd,
      isFuture: now < start,
    }

    const avisTimings: StageTimings = {
      stage: 'AVIS',
      startDate: new Date(clarificationsEnd),
      endDate: new Date(avisEnd),
      isActive: now >= clarificationsEnd && now < avisEnd,
      isPast: now >= avisEnd,
      isFuture: now < clarificationsEnd,
    }

    const amendementsTimings: StageTimings = {
      stage: 'AMENDEMENTS',
      startDate: new Date(avisEnd),
      endDate: new Date(amendementsEnd),
      isActive: now >= avisEnd && now < amendementsEnd,
      isPast: now >= amendementsEnd,
      isFuture: now < avisEnd,
    }

    const objectionsTimings: StageTimings = {
      stage: 'OBJECTIONS',
      startDate: new Date(amendementsEnd),
      endDate: new Date(objectionsEnd),
      isActive: now >= amendementsEnd && now < objectionsEnd,
      isPast: now >= objectionsEnd,
      isFuture: now < amendementsEnd,
    }

    return {
      clarifications: clarificationsTimings,
      avis: avisTimings,
      amendements: amendementsTimings,
      objections: objectionsTimings,
    }
  }
}

/**
 * Détermine le stade actuel d'une décision en fonction de l'heure actuelle
 *
 * @param startDate - Date de lancement
 * @param endDate - Date limite
 * @param mode - Mode de déroulement
 * @param consentAmendmentAction - Action d'amendement (si déjà effectuée)
 * @returns Le stade actuel
 */
export function getCurrentConsentStage(
  startDate: Date | null,
  endDate: Date | null,
  mode: ConsentStepMode,
  consentAmendmentAction: string | null
): ConsentStage {
  if (!startDate || !endDate) {
    return 'CLARIFICATIONS' // Par défaut avant le lancement
  }

  const now = Date.now()
  const end = endDate.getTime()

  // Si la date limite est dépassée
  if (now >= end) {
    return 'TERMINEE'
  }

  // Si le créateur a déjà pris une action d'amendement, on passe directement aux objections
  if (consentAmendmentAction) {
    return 'OBJECTIONS'
  }

  const timings = calculateConsentStageTimings(startDate, endDate, mode)

  // Trouver le stade actif
  if (timings.clarifavis?.isActive) return 'CLARIFAVIS'
  if (timings.clarifications?.isActive) return 'CLARIFICATIONS'
  if (timings.avis?.isActive) return 'AVIS'
  if (timings.amendements.isActive) return 'AMENDEMENTS'
  if (timings.objections.isActive) return 'OBJECTIONS'

  // Par défaut (ne devrait jamais arriver)
  return mode === 'MERGED' ? 'CLARIFAVIS' : 'CLARIFICATIONS'
}

/**
 * Vérifie si une transition de stade doit avoir lieu
 *
 * @param currentStage - Stade actuel stocké en base
 * @param calculatedStage - Stade calculé en fonction de l'heure
 * @returns true si une transition est nécessaire
 */
export function shouldTransitionToNextStage(
  currentStage: ConsentStage | null,
  calculatedStage: ConsentStage
): boolean {
  if (!currentStage) return true
  return currentStage !== calculatedStage
}

/**
 * Vérifie si le créateur peut amender la proposition
 *
 * @param currentStage - Stade actuel
 * @param creatorId - ID du créateur
 * @param userId - ID de l'utilisateur qui tente l'action
 * @returns true si l'amendement est possible
 */
export function canAmendProposal(
  currentStage: ConsentStage | null,
  creatorId: string,
  userId: string
): boolean {
  if (creatorId !== userId) return false
  return currentStage === 'AMENDEMENTS'
}

/**
 * Vérifie si un participant peut soumettre une objection
 *
 * @param currentStage - Stade actuel
 * @returns true si les objections sont ouvertes
 */
export function canObjectToProposal(currentStage: ConsentStage | null): boolean {
  return currentStage === 'OBJECTIONS'
}

/**
 * Vérifie si un participant peut poser une question de clarification
 *
 * @param currentStage - Stade actuel
 * @param mode - Mode de déroulement
 * @returns true si les questions sont autorisées
 */
export function canAskClarificationQuestion(
  currentStage: ConsentStage | null,
  mode: ConsentStepMode
): boolean {
  if (mode === 'MERGED') {
    return currentStage === 'CLARIFAVIS'
  } else {
    return currentStage === 'CLARIFICATIONS' || currentStage === 'AVIS'
  }
}

/**
 * Vérifie si un participant peut donner un avis
 *
 * @param currentStage - Stade actuel
 * @param mode - Mode de déroulement
 * @returns true si les avis sont autorisés
 */
export function canGiveOpinion(
  currentStage: ConsentStage | null,
  mode: ConsentStepMode
): boolean {
  if (mode === 'MERGED') {
    return currentStage === 'CLARIFAVIS'
  } else {
    return currentStage === 'AVIS'
  }
}

/**
 * Calcule le résultat final d'une décision par consentement
 *
 * @param objections - Liste des objections avec leur statut
 * @param totalParticipants - Nombre total de participants
 * @param consentAmendmentAction - Action d'amendement du créateur
 * @returns Le résultat de la décision
 */
export function calculateConsentResult(
  objections: Array<{ status: string; withdrawnAt: Date | null }>,
  totalParticipants: number,
  consentAmendmentAction: string | null
): {
  result: 'APPROVED' | 'BLOCKED' | 'WITHDRAWN'
  details: {
    noObjectionCount: number
    objectionCount: number
    noPositionCount: number
    notVotedCount: number
  }
} {
  // Si le créateur a retiré la proposition
  if (consentAmendmentAction === 'WITHDRAWN') {
    return {
      result: 'WITHDRAWN',
      details: {
        noObjectionCount: 0,
        objectionCount: 0,
        noPositionCount: 0,
        notVotedCount: totalParticipants,
      },
    }
  }

  // Compter les objections actives (non retirées)
  const activeObjections = objections.filter(o => !o.withdrawnAt)

  let noObjectionCount = 0
  let objectionCount = 0
  let noPositionCount = 0

  activeObjections.forEach(obj => {
    if (obj.status === 'NO_OBJECTION') noObjectionCount++
    else if (obj.status === 'OBJECTION') objectionCount++
    else if (obj.status === 'NO_POSITION') noPositionCount++
  })

  const notVotedCount = totalParticipants - activeObjections.length

  // S'il y a au moins une objection active → BLOCKED
  if (objectionCount > 0) {
    return {
      result: 'BLOCKED',
      details: {
        noObjectionCount,
        objectionCount,
        noPositionCount,
        notVotedCount,
      },
    }
  }

  // Sinon → APPROVED
  return {
    result: 'APPROVED',
    details: {
      noObjectionCount,
      objectionCount,
      noPositionCount,
      notVotedCount,
    },
  }
}

/**
 * Vérifie si tous les participants ont consenti (pour clôture anticipée)
 *
 * @param objections - Liste des objections
 * @param totalParticipants - Nombre total de participants
 * @returns true si tous ont voté NO_OBJECTION
 */
export function allParticipantsConsented(
  objections: Array<{ status: string; withdrawnAt: Date | null }>,
  totalParticipants: number
): boolean {
  const activeObjections = objections.filter(o => !o.withdrawnAt)

  // Vérifier que tous les participants ont voté
  if (activeObjections.length !== totalParticipants) {
    return false
  }

  // Vérifier que tous ont voté NO_OBJECTION
  return activeObjections.every(obj => obj.status === 'NO_OBJECTION')
}

/**
 * Obtient le message de conclusion en fonction du résultat
 *
 * @param result - Résultat de la décision
 * @param details - Détails des votes
 * @param decidedAt - Date de décision
 * @param creatorName - Nom du créateur (pour WITHDRAWN)
 * @returns Message de conclusion formaté
 */
export function getConsentConclusionMessage(
  result: 'APPROVED' | 'BLOCKED' | 'WITHDRAWN',
  details: {
    noObjectionCount: number
    objectionCount: number
    noPositionCount: number
    notVotedCount: number
  },
  decidedAt: Date,
  creatorName?: string
): string {
  const dateStr = decidedAt.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  if (result === 'WITHDRAWN') {
    return `${dateStr} - ${creatorName || 'Le créateur'} a retiré sa proposition après la phase de clarifications et d'avis.`
  }

  if (result === 'APPROVED') {
    if (details.notVotedCount === 0 && details.noPositionCount === 0) {
      return `${dateStr} - La décision a été prise par consentement. 100% de consentement.`
    } else {
      return `${dateStr} - La décision a été prise par consentement. ${details.noObjectionCount} participant(s) ont consenti (PAS D'OBJECTION) et ${details.noPositionCount + details.notVotedCount} participant(s) ne se sont pas prononcés.`
    }
  }

  if (result === 'BLOCKED') {
    return `${dateStr} - La proposition a reçu au moins une objection et a donc été bloquée. La décision n'est pas prise. ${details.noObjectionCount} participant(s) ont consenti (PAS D'OBJECTION), ${details.noPositionCount + details.notVotedCount} participant(s) ne se sont pas prononcés et ${details.objectionCount} ont émis une objection.`
  }

  return `${dateStr} - Résultat inconnu.`
}

/**
 * Valide la durée minimale d'une décision par consentement (7 jours)
 *
 * @param startDate - Date de début
 * @param endDate - Date de fin
 * @returns true si la durée est valide
 */
export function validateConsentDecisionDuration(
  startDate: Date,
  endDate: Date
): boolean {
  const minDuration = 7 * 24 * 60 * 60 * 1000 // 7 jours en millisecondes
  const duration = endDate.getTime() - startDate.getTime()
  return duration >= minDuration
}
