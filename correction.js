import { getChoppingData,processQueries } from "./services/dbUtils.js";// Import necessary modules

// const moment = require('moment');
import moment from 'moment';// Import the moment library

export const  processChoppingDataByDay= async(startDate, endDate)=> {
  let currentDate = moment(startDate); // Initialize current date
  const finalDate = moment(endDate); // Set the final date

  while (currentDate.isBefore(finalDate)) {
    const nextDate = currentDate.clone().add(1, 'day'); // Get the next day's start date

    console.log(`Processing data for: ${currentDate.format('YYYY-MM-DD')}`);

    // Call the function for the current day
    const data = await getChoppingData(
      currentDate.format('YYYY-MM-DD'),
      nextDate.format('YYYY-MM-DD')
    );


    const queries = generateQueries(data);

     processQueries(queries.deleteQuery, queries.updateQueries);
    // Process the data for the current day (placeholder for your logic)
    console.log(`Data for ${currentDate.format('YYYY-MM-DD')}:`, data);

    // Move to the next day
    currentDate = nextDate;
  }
}

// Example usage



export const generateQueries = (data) => {
          const originalIds = data.map(item => item.id);
          data.forEach(item => {
            if (item.item_code === 'G8901') {
              item.item_code = 'G8900';
            }
          });
         const groupedData = data.reduce((acc, item) => {
  // Convert the Date object to a string in ISO format and extract the date part
          const datePart = item.created_at.toISOString().split('T')[0];
          const key = `${item.chopping_id}-${datePart}`;
          
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(item);
          return acc;
        }, {});


          // console.log(groupedData);


          //order the grouped data by created_at
          for (const key in groupedData) {
            groupedData[key].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          }

          // console.log(groupedData);

          //loop through the grouped data and find two consecutive items with the same item_code and output 0 and same weight
          for (const key in groupedData) {
            const items = groupedData[key];
            for (let i = 0; i < items.length - 1; i++) {
              if (
                items[i].item_code === items[i + 1].item_code &&
                items[i].output === 0 &&
                items[i + 1].output === 0 &&
                items[i].weight === items[i + 1].weight
              ) {
              //   console.log(`Found consecutive items with same item_code, output 0, and same weight:`, items[i], items[i + 1]);
              }
            }
          }


          //remove all instances of the consecutive items apart from the first one
          for (const key in groupedData) {
            const items = groupedData[key];
            groupedData[key] = items.filter((item, index) => {
              if (index === 0) return true;
              return !(item.item_code === items[index - 1].item_code &&
                      item.output === 0 &&
                      item.weight === items[index - 1].weight);
            });

            //generate delete queries for the removed items
            

          }


           const updateQueries = [];
          const table = '[chopping_lines]';

          //compute the total weight of the output item
          //replace the output item weight with the total weight computed above
          for (const key in groupedData) {
            const items = groupedData[key];
            const totalWeight = items.reduce((acc, item) => {
              if (item.output === 0) {
                acc += item.weight;
              }
              return acc;
            }, 0);

            items.forEach(item => {
              if (item.output === 1) {
                item.weight =  totalWeight.toFixed(2);

                updateQueries.push(`UPDATE ${table} SET weight = ${totalWeight} WHERE id = ${item.id}`);
              }
            });

           
             
          }

          // console.log(groupedData);

          //ensure json is correctly formatted
          const correctedData = [];
          for (const key in groupedData) {
            correctedData.push(...groupedData[key]);
          }

          // console.log(correctedData);  

          //get the ids if the items remaining
          const remaining = correctedData.map(item => item.id);
          // console.log(remaining);


          //resolve the deleted ids by diffing with original ids
          const removedIds = originalIds.filter(id => !remaining.includes(id));
          // console.log(removedIds);

          //prepare two queries: one to delete the removed ids from the database, the other to update the output items with the correct weight
          const deleteQuery = `DELETE FROM ${table} WHERE id IN (${removedIds.join(',')})`;
          // console.log(deleteQuery);


          //get the id of the output item and do an update query 
          // const outputId = correctedData.find(item => item.output === 1).id;
          // const updateQuery = `UPDATE table SET weight = ${correctedData.find(item => item.id === outputId).weight} WHERE id = ${outputId}`;
          // console.log(updateQuery); 

          return { deleteQuery, updateQueries };

  }

  processChoppingDataByDay('2025-01-04', '2025-01-16').catch((err) =>
    console.error('Error processing chopping data by day:', err.message)
  );


  // console.log(queries);












// console.log(removedIds);


