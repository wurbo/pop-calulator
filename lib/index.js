const indexList = (value, index) => ({
    index,
    use: true,
    ...value,
})

const getParty = (crew, captains, shipParts, shipwright, target) => {
    const indexedCrew = crew.map(indexList)
    const indexedCaptains = captains.map(indexList)
    const indexedShipParts = shipParts.map(indexList)

    let highestAverage = 0
    let partyToUse = null

    const start = new Date().getTime()

    const forcedCrewMembers = []

    let calculations = 0

    const uniqueMemberSets = new Set()

    const onlyMerchants = indexedCrew.filter(
        (crewmate) => crewmate.crewType === 'terracotta-merchant',
    )

    const forceMerchant = true

    // Baseline
    // Took 13073 ms
    // Total calcs 102604320
    const buildMemberList = (captain, members = [], targetLength = 5) => {
        const crewToUse =
            forceMerchant && members.length === 0 ? onlyMerchants : indexedCrew

        const allowedMembers = forcedCrewMembers[members.length]
            ? [forcedCrewMembers[members.length]]
            : crewToUse.filter(
                  (c) =>
                      c.use &&
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
                return indexedCrew[parseInt(index)]
            })

            const partyWithCaptain = [captain, ...shipPartsList, ...newMembers]
            doCalculation(partyWithCaptain)
        }
    }

    console.log('Building member list')
    buildMemberList()
    console.log('Total unique members combinations', uniqueMemberSets.size)

    const hulls = indexedShipParts.filter(
        (shipParts) => shipParts.type === 'hull',
    )
    const decks = indexedShipParts.filter(
        (shipParts) => shipParts.type === 'deck',
    )
    const ramFigureheads = indexedShipParts.filter(
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

    console.log('Total unique ship part combinations', uniqueShipPartSets.size)

    for (const captain of indexedCaptains) {
        for (const shipPartSet of uniqueShipPartSets) {
            const shipPartsList = shipPartSet.split('|').map((index) => {
                return indexedShipParts[parseInt(index)]
            })
            calculateCrews(captain, shipPartsList)
        }
    }

    console.log('target', target)
    console.log('use this party', partyToUse)

    const end = new Date().getTime()
    const time = end - start

    console.log('Took', time, 'ms')
    console.log('Total calcs', calculations)
}

const crew = [
    { morale: 4010, seafaring: 0, combat: 0, crewType: 'zhonghu-player' },
    { morale: 3780, seafaring: 0, combat: 0, crewType: 'zhonghu-player' },
    { morale: 4230, seafaring: 0, combat: 0, crewType: 'zhonghu-player' },
    { morale: 4200, seafaring: 0, combat: 0, crewType: 'zhonghu-player' },
    { morale: 3780, seafaring: 0, combat: 0, crewType: 'zhonghu-player' },
    { morale: 3150, seafaring: 0, combat: 0, crewType: 'zhonghu-player' },
    {
        morale: 40,
        seafaring: 4210,
        combat: 30,
        crewType: 'stargazer',
    },
    { morale: 10, seafaring: 3990, combat: 0, crewType: 'stargazer' },
    { morale: 0, seafaring: 3570, combat: 0, crewType: 'stargazer' },
    { morale: 0, seafaring: 3410, combat: 0, crewType: 'stargazer' },
    { morale: 10, seafaring: 3360, combat: 0, crewType: 'stargazer' },
    { morale: 0, seafaring: 3990, combat: 0, crewType: 'stargazer' },
    {
        morale: 20,
        seafaring: 0,
        combat: 4020,
        crewType: 'gu-bodyguard',
    },
    {
        morale: 0,
        seafaring: 0,
        combat: 4200,
        crewType: 'gu-bodyguard',
    },
    { morale: 0, seafaring: 0, combat: 3580, crewType: 'gu-bodyguard' },
    { morale: 0, seafaring: 100, combat: 3360, crewType: 'gu-bodyguard' },
    { morale: 10, seafaring: 0, combat: 4200, crewType: 'gu-bodyguard' },
    { morale: 0, seafaring: 0, combat: 3410, crewType: 'gu-bodyguard' },
    {
        morale: 1300,
        seafaring: 0,
        combat: 10,
        crewType: 'terracotta-merchant',
    },
    { morale: 1310, seafaring: 0, combat: 0, crewType: 'terracotta-merchant' },
    { morale: 1300, seafaring: 0, combat: 0, crewType: 'terracotta-merchant' },
    { morale: 1300, seafaring: 0, combat: 0, crewType: 'terracotta-merchant' },
    {
        morale: 900,
        seafaring: 2900,
        combat: 900,
        crewType: 'kharidian-exile',
        solidarity: true,
    },
    {
        morale: 855,
        seafaring: 2755,
        combat: 855,
        crewType: 'kharidian-exile',
        solidarity: true,
    },
    {
        morale: 720,
        seafaring: 2320,
        combat: 720,
        crewType: 'kharidian-exile',
        solidarity: true,
    },
]

const shipwright = {
    morale: 0.05,
    combat: 0.03,
    seafaring: 0.03,
}

const captains = [
    {
        morale: 1940,
        seafaring: 1150,
        combat: 0,
        name: 'Alexander Drake',
        crewType: 'captain',
    },
    {
        morale: 1010,
        seafaring: 1990,
        combat: 1200,
        spercent: 0.01,
        name: 'Kang the Ghost',
        crewType: 'captain',
    },
    {
        morale: 1160,
        seafaring: 1105,
        combat: 1995,
        cpercent: 0.01,
        name: 'Barnabas Bonny',
        crewType: 'captain',
    },
]
const shipParts = [
    {
        type: 'hull',
        name: 'Golden Katana Hull',
        morale: 500,
        combat: 500,
        seafaring: 1200,
    },
    {
        type: 'hull',
        name: 'Blazing Lantern Hull',
        morale: 1400,
        combat: 500,
        seafaring: 500,
    },
    {
        type: 'hull',
        name: 'Blackwater Hull',
        morale: 850,
        combat: 750,
        seafaring: 1700,
    },
    {
        type: 'hull',
        name: 'Shimmering Azure Hull',
        morale: 1325,
        combat: 1325,
        seafaring: 1325,
    },
    {
        type: 'deck',
        name: 'Overwhelmingly Large Cannon x4',
        morale: 0,
        seafaring: 0,
        combat: 1750,
    },
    {
        type: 'deck',
        name: 'Bladewing Rigging',
        morale: 0,
        seafaring: 2000,
        combat: 0,
    },
    {
        type: 'deck',
        name: 'Fineglow Lanterns',
        morale: 2000,
        seafaring: 0,
        combat: 0,
    },
    {
        type: 'ramFigurehead',
        name: 'Figurehead of the Spires',
        morale: 950,
        seafaring: 100,
        combat: 0,
    },
    {
        type: 'ramFigurehead',
        name: 'Ram of the Bladewing',
        morale: 0,
        seafaring: 0,
        combat: 1100,
    },
]

const target = {
    morale: 12800,
    seafaring: 12800,
    combat: 12800,
}

getParty(crew, captains, shipParts, shipwright, target)
