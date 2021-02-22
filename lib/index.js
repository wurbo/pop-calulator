const indexList = (value, index) => ({
    index,
    used: false,
    ...value,
})

// implement logger
const logger = {
    log: () => {},
}

const calculate = (portData, options) => {
    const crew = portData.crew.map(indexList)
    const captains = portData.captains.map(indexList)
    const shipParts = portData.shipParts.map(indexList)
    const shipwright = portData.shipwright

    let highestAverage = 0
    let partyToUse = null

    const start = new Date().getTime()

    const forcedCrewMembers = []

    let calculations = 0

    const uniqueMemberSets = new Set()

    const onlyMerchants = crew.filter(
        (crewmate) => crewmate.crewType === 'terracotta-merchant',
    )

    const { forceMerchant, target } = options

    // Baseline
    // Took 13073 ms
    // Total calcs 102604320
    const buildMemberList = (captain, members = [], targetLength = 5) => {
        const crewToUse =
            forceMerchant && members.length === 0 ? onlyMerchants : crew

        const allowedMembers = forcedCrewMembers[members.length]
            ? [forcedCrewMembers[members.length]]
            : crewToUse.filter(
                  (c) =>
                      !c.used &&
                      !members.map((member) => member.index).includes(c.index), // Prevent duplicates
              )
        for (const crewmember of allowedMembers) {
            const newMembers = [...members, crewmember].sort((a, b) => {
                return a.index - b.index
            })

            if (newMembers.length < targetLength) {
                buildMemberList(captain, newMembers, targetLength)
                continue
            }

            const memberString = newMembers
                .map((member) => member.index)
                .join('|')

            uniqueMemberSets.add(memberString)
        }
    }

    // Todo Test this separately for accuracy
    const doCalculation = (partyWithCaptain) => {
        calculations++

        let usedSolidarity = false

        // Captain always in first position
        const captain = partyWithCaptain[0]

        // Always use 1 because of captain
        const totalTypes = new Set(
            partyWithCaptain
                .filter((member) => member.crewType)
                .map((member) => member.crewType),
        ).size

        const total = partyWithCaptain.reduce(
            (total, crewmate) => {
                let solidarityBonus = 0
                if (crewmate.solidarity && !usedSolidarity) {
                    usedSolidarity = true
                    solidarityBonus = totalTypes * 125 // Todo, support different ranked solidarities
                } else {
                    solidarityBonus = 0
                }

                total.morale += crewmate.morale + solidarityBonus
                total.seafaring += crewmate.seafaring + solidarityBonus
                total.combat += crewmate.combat + solidarityBonus
                return total
            },
            { morale: 0, seafaring: 0, combat: 0 },
        )

        const multipliers = {
            morale: 1,
            seafaring: 1,
            combat: 1,
        }

        // calculate captain traits
        if (captain.mpercent) {
            multipliers.morale += captain.mpercent
        }
        if (captain.spercent) {
            multipliers.seafaring += captain.spercent
        }
        if (captain.cpercent) {
            multipliers.combat += captain.cpercent
        }

        multipliers.morale += shipwright.morale
        multipliers.seafaring += shipwright.seafaring
        multipliers.combat += shipwright.combat

        // Calculate shipwright
        total.morale = Math.floor(total.morale * multipliers.morale)
        total.seafaring = Math.floor(total.seafaring * multipliers.seafaring)
        total.combat = Math.floor(total.combat * multipliers.combat)

        const averages = []

        if (target.morale) {
            averages.push(total.morale / target.morale)
        }

        if (target.seafaring) {
            averages.push(total.seafaring / target.seafaring)
        }

        if (target.combat) {
            averages.push(total.combat / target.combat)
        }

        let currentAverage = Math.min(...averages)

        if (currentAverage > highestAverage) {
            highestAverage = currentAverage
            partyToUse = {
                party: partyWithCaptain,
                total,
                successChance: Math.floor(currentAverage * 100) + '%',
            }
        }
    }

    const calculateCrews = (captain, shipPartsList) => {
        for (const newMemberSet of uniqueMemberSets) {
            const newMembers = newMemberSet.split('|').map((index) => {
                return crew[parseInt(index)]
            })

            const partyWithCaptain = [captain, ...shipPartsList, ...newMembers]
            doCalculation(partyWithCaptain)
        }
    }

    logger.log('Building member list')
    buildMemberList()
    logger.log('Total unique members combinations', uniqueMemberSets.size)

    const hulls = shipParts.filter((shipParts) => shipParts.type === 'hull')
    const decks = shipParts.filter((shipParts) => shipParts.type === 'deck')
    const ramFigureheads = shipParts.filter(
        (shipParts) => shipParts.type === 'ramFigurehead',
    )

    const uniqueShipPartSets = new Set()

    for (const ramFigurehead of ramFigureheads) {
        for (const hull of hulls) {
            for (const deck1 of decks) {
                for (const deck2 of decks) {
                    const shipParts = [ramFigurehead, hull, deck1, deck2].sort(
                        (a, b) => {
                            return a.index - b.index
                        },
                    )

                    const shipPartString = shipParts
                        .map((shipPart) => shipPart.index)
                        .join('|')

                    uniqueShipPartSets.add(shipPartString)
                }
            }
        }
    }

    logger.log('Total unique ship part combinations', uniqueShipPartSets.size)

    for (const captain of captains) {
        for (const shipPartSet of uniqueShipPartSets) {
            const shipPartsList = shipPartSet.split('|').map((index) => {
                return shipParts[parseInt(index)]
            })
            calculateCrews(captain, shipPartsList)
        }
    }

    logger.log('target', target)
    logger.log('use this party', partyToUse)

    const end = new Date().getTime()
    const time = end - start

    logger.log('Took', time, 'ms')
    logger.log('Total calcs', calculations)

    return partyToUse
}

module.exports = calculate
