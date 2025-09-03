<?php

namespace App\Http\Controllers\Warranty;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WarrantyPumkinController extends Controller
{
    public function index(){
        return Inertia::render('warranty/WPK');
    }
}
