const inquirer = require('inquirer')
const _ = require('lodash')
const calculate = require('../lib')
const fs = require('fs')

const saveJson = async (portData) => {
    await fs.promises.writeFile('data.json', JSON.stringify(portData, null, 2))
}

const filterNumber = (input) => {
    return parseInt(input) || 0
}

const markNotUsed = (objects) => {
    return objects.map((object) => {
        object.used = false
    })
}

const run = async () => {
    const data = JSON.parse(
        (await fs.promises.readFile('data.json')).toString(),
    )

    let exit = false

    while (!exit) {
        const { response } = await inquirer.prompt([
            {
                name: 'response',
                type: 'list',
                message: 'What do you want to do?',
                choices: [
                    {
                        value: 'calculateVoyage',
                        name: `Calculate voyage (${
                            data.crew.filter((c) => !c.used).length
                        } usable crewmates)`,
                    },
                    {
                        value: 'markCrewmatesUseable',
                        name: 'Mark all crewmates as useable',
                    },
                    {
                        value: 'exit',
                        name: 'Exit',
                    },
                ],
            },
        ])

        if (response === 'exit') {
            process.exit()
        }

        if (response === 'markCrewmatesUseable') {
            console.log('Done, all of your crewmates are now useable.')

            markNotUsed(data.crew)
            markNotUsed(data.captains)

            await saveJson(data)
            continue
        }

        const options = await inquirer.prompt([
            {
                name: 'target.morale',
                message: 'Morale Target?',
                filter: filterNumber,
            },
            {
                name: 'target.combat',
                message: 'Combat Target?',
                filter: filterNumber,
            },
            {
                name: 'target.seafaring',
                message: 'Seafaring Target?',
                filter: filterNumber,
            },
            {
                name: 'forceMerchant',
                message: 'Force merchant?',
                default: true,
            },
        ])

        console.log('Calculating...')
        const partyToUse = calculate(data, options)
        const useCrew = partyToUse.party.filter(
            (p) => p.crewType && p.crewType !== 'captain',
        )

        const useCaptain = partyToUse.party[0]

        console.log(`Success Chance (${partyToUse.successChance})`)
        console.log(
            `Totals - M: ${partyToUse.total.morale}, S: ${partyToUse.total.seafaring}, C: ${partyToUse.total.combat}`,
        )
        console.log('\nCaptain:', useCaptain.name)
        console.log('Hull:', filterType(partyToUse.party, 'hull'))
        console.log('Decks:', filterType(partyToUse.party, 'deck'))
        console.log(
            'Ram/Figurehead:',
            filterType(partyToUse.party, 'ramFigurehead'),
        )
        console.log('\nCrew:')
        console.log(
            useCrew
                .map((p) => {
                    return `Type: ${p.crewType} M: ${p.morale} S: ${p.seafaring} C: ${p.combat}`
                })
                .join('\n'),
        )

        const { confirmAway } = await inquirer.prompt([
            {
                name: 'confirmAway',
                type: 'confirm',
                message: 'Mark these crewmates as away?',
            },
        ])

        if (confirmAway) {
            useCrew.forEach((crewmate) => {
                data.crew[crewmate.index].used = true
            })
            data.captains[useCaptain.index].used = true
            await saveJson(data)
            console.log('Marked the party as away.')
        }
    }
}

const filterType = (party, type) =>
    party
        .filter((p) => p.type === type)
        .map((p) => p.name)
        .join(', ')

run()
