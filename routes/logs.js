import {get_saved_error} from "../save_logs";
const express = require('express');
const router = express.Router();

router.get('/:count?', async (req, res) => {
    let count = Number(req.params.count) || 30;

    let data = await get_saved_error(count)
    return res.json(data);
});


export default router;
